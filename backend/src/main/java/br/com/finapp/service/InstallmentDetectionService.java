package br.com.finapp.service;

import br.com.finapp.domain.Transaction;
import br.com.finapp.dto.DetectionDto;
import br.com.finapp.repository.TransactionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Detecção de parcelamentos via regex N/M na descrição — algoritmo 5.4
 * (ipc-db.md).
 *
 * Critérios (RN-06, RN-07, RN-17):
 * - Apenas transações de cartão de crédito
 * - Sem installment_group_id (ainda não vinculadas a um grupo)
 * - Dentro da janela de 2 meses a partir de hoje
 * - Descrição contém padrão: \b(\d{1,2})\s*(?:\/|-|de)\s*(\d{1,2})\b (ex:
 * "3/12", "3-12", "3 DE 12")
 * - total >= 2, 1 <= current <= total
 *
 * Resultado: DetectedInstallment por grupo (creditCardId :: descBase :: total)
 * first_billing_month calculado retroativamente a partir do installment_number
 * mais baixo encontrado.
 */
@ApplicationScoped
public class InstallmentDetectionService {

    /** Regex que captura "N/M", "N-M" ou "N DE M" case-insensitive */
    private static final Pattern INSTALLMENT_REGEX = Pattern.compile("\\b(\\d{1,2})\\s*(?:/|-|de)\\s*(\\d{1,2})\\b",
            Pattern.CASE_INSENSITIVE);

    private static final DateTimeFormatter MONTH_YEAR_FMT = DateTimeFormatter.ofPattern("MM/yyyy");

    @Inject
    TransactionRepository transactionRepository;

    /**
     * Detecta grupos candidatos a parcelamento para o usuário.
     *
     * @param userId UUID do usuário autenticado
     * @return lista de {@link DetectionDto.DetectedInstallment}
     */
    public List<DetectionDto.DetectedInstallment> detect(UUID userId) {
        LocalDate cutoff = LocalDate.now().minusMonths(2);

        // Busca transações de cartão sem grupo de parcelamento vinculado, dentro da
        // janela
        List<Transaction> candidates = transactionRepository
                .list("userId = ?1 AND creditCard IS NOT NULL AND installmentGroup IS NULL AND date >= ?2",
                        userId, cutoff);

        // Map: key → lista de transações candidatas para o mesmo parcelamento
        Map<String, List<Transaction>> groups = new LinkedHashMap<>();

        for (Transaction tx : candidates) {
            Matcher m = INSTALLMENT_REGEX.matcher(tx.description);
            if (!m.find())
                continue;

            int current = Integer.parseInt(m.group(1));
            int total = Integer.parseInt(m.group(2));

            if (total < 2 || current < 1 || current > total)
                continue;

            // Descrição base: remove a parte "N/M" e espaços extras
            String base = INSTALLMENT_REGEX.matcher(tx.description).replaceAll("").trim();
            String key = tx.creditCard.id + "::" + base + "::" + total;

            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(tx);
        }

        return groups.entrySet().stream()
                .map(entry -> buildDetectedInstallment(entry.getValue()))
                .collect(Collectors.toList());
    }

    private DetectionDto.DetectedInstallment buildDetectedInstallment(List<Transaction> txs) {
        // Ordena por installment_number crescente (extraído do regex)
        txs.sort(Comparator.comparingInt(tx -> extractInstallmentNumber(tx.description)));

        Transaction first = txs.get(0);
        Matcher m = INSTALLMENT_REGEX.matcher(first.description);
        m.find();
        int currentOfFirst = Integer.parseInt(m.group(1));
        int total = Integer.parseInt(m.group(2));

        BigDecimal installmentAmount = first.amount;
        BigDecimal totalAmount = installmentAmount
                .multiply(BigDecimal.valueOf(total))
                .setScale(2, RoundingMode.HALF_UP);

        // first_billing_month: retrocede (currentOfFirst - 1) meses a partir da data da
        // tx mais antiga
        LocalDate firstBillingDate = first.date.minusMonths(currentOfFirst - 1L);
        String firstBillingMonth = firstBillingDate.format(MONTH_YEAR_FMT);

        String base = INSTALLMENT_REGEX.matcher(first.description).replaceAll("").trim();

        var dto = new DetectionDto.DetectedInstallment();
        dto.creditCardId = first.creditCard.id;
        dto.description = base;
        dto.totalInstallments = total;
        dto.installmentAmount = installmentAmount;
        dto.totalAmount = totalAmount;
        dto.firstBillingMonth = firstBillingMonth;
        dto.transactionIds = txs.stream().map(tx -> tx.id).collect(Collectors.toList());
        return dto;
    }

    private int extractInstallmentNumber(String description) {
        Matcher m = INSTALLMENT_REGEX.matcher(description);
        if (m.find()) {
            return Integer.parseInt(m.group(1));
        }
        return 0;
    }
}

/**
 * CategoriesScreen — Gestão de categorias de transações
 *
 * Spec: _reversa_sdd/sdd/categories.md
 * CRUD completo: listar, criar, editar, excluir categorias.
 */

import { Feather } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    PanResponder,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui';
import { useSideMenu } from '@/contexts/SideMenuContext';
import { useCategories, type CategoryCreate } from '@/hooks/useCategories';
import type { Category } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.92;

const COLOR_PALETTE = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#6366f1', // indigo
    '#a855f7', // purple
    '#ec4899', // pink
];

const TYPE_OPTIONS: { value: string | null; label: string }[] = [
    { value: null, label: 'Qualquer' },
    { value: 'income', label: 'Receita' },
    { value: 'expense', label: 'Despesa' },
    { value: 'investment', label: 'Investimento' },
    { value: 'transfer', label: 'Transferência' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CategoriesScreen
// ─────────────────────────────────────────────────────────────────────────────

export function CategoriesScreen() {
    const { openMenu } = useSideMenu();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // ── Colors ────────────────────────────────────────────────────────────────
    const bg = isDark ? '#0f1219' : '#f5f7fa';
    const cardBg = isDark ? '#1a1f2e' : '#ffffff';
    const textPrimary = isDark ? '#e5e7eb' : '#1a1f2e';
    const textMuted = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#2d3550' : '#e5e7eb';
    const bgInput = isDark ? '#252d45' : '#f3f4f8';
    const accent = '#6366f1';

    // ── Data ──────────────────────────────────────────────────────────────────
    const { categories, loading, refetch, createCategory, updateCategory, deleteCategory } = useCategories();

    // ── Sheet state ───────────────────────────────────────────────────────────
    const [sheetVisible, setSheetVisible] = useState(false);
    const [editTarget, setEditTarget] = useState<Category | null>(null);
    const [formName, setFormName] = useState('');
    const [formColor, setFormColor] = useState<string | null>(null);
    const [formType, setFormType] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // ── Sheet animation ───────────────────────────────────────────────────────
    const translateY = useRef(new Animated.Value(SHEET_H)).current;
    const onCloseRef = useRef<(() => void) | null>(null);

    const openSheet = (target: Category | null) => {
        setEditTarget(target);
        if (target) {
            setFormName(target.name);
            setFormColor(target.color ?? null);
            setFormType(target.type ?? null);
        } else {
            setFormName('');
            setFormColor(null);
            setFormType(null);
        }
        setSheetVisible(true);
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 24,
            stiffness: 220,
            mass: 0.8,
        }).start();
    };

    const closeSheet = () => {
        Animated.timing(translateY, {
            toValue: SHEET_H,
            duration: 220,
            useNativeDriver: true,
        }).start(() => setSheetVisible(false));
    };

    onCloseRef.current = closeSheet;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10,
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) translateY.setValue(gs.dy);
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 80 || gs.vy > 0.4) {
                    onCloseRef.current?.();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        damping: 24,
                        stiffness: 220,
                        mass: 0.8,
                    }).start();
                }
            },
        }),
    ).current;

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleSave = async () => {
        const name = formName.trim();
        if (!name) {
            Alert.alert('Atenção', 'O nome da categoria é obrigatório.');
            return;
        }
        setSaving(true);
        try {
            const payload: CategoryCreate = {
                name,
                color: formColor,
                type: formType,
            };
            if (editTarget) {
                await updateCategory(editTarget.id, payload);
            } else {
                await createCategory(payload);
            }
            closeSheet();
        } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!editTarget) return;
        Alert.alert(
            'Excluir categoria',
            `Excluir "${editTarget.name}"? As transações vinculadas não serão excluídas.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        setSaving(true);
                        try {
                            await deleteCategory(editTarget.id);
                            closeSheet();
                        } catch (e) {
                            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível excluir.');
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ],
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'left', 'right']}>
            <AppHeader
                title="Categorias"
                onLeftPress={openMenu}
                rightElement={
                    <TouchableOpacity
                        onPress={() => openSheet(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Feather name="plus" size={22} color={accent} />
                    </TouchableOpacity>
                }
            />

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={accent} size="large" />
                </View>
            ) : categories.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                    <Feather name="tag" size={48} color={isDark ? '#374151' : '#d1d5db'} />
                    <Text style={{ color: textMuted, fontSize: 15, marginTop: 16, textAlign: 'center' }}>
                        Nenhuma categoria cadastrada.{'\n'}Toque em + para criar a primeira.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={categories}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={{ padding: 16, gap: 8 }}
                    onRefresh={refetch}
                    refreshing={loading}
                    renderItem={({ item }) => (
                        <CategoryRow
                            category={item}
                            cardBg={cardBg}
                            textPrimary={textPrimary}
                            textMuted={textMuted}
                            borderColor={borderColor}
                            accent={accent}
                            onPress={() => openSheet(item)}
                        />
                    )}
                />
            )}

            {/* ── Bottom Sheet ── */}
            <Modal
                visible={sheetVisible}
                transparent
                animationType="none"
                onRequestClose={closeSheet}
            >
                <View style={{ flex: 1 }}>
                    <Pressable
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                        onPress={closeSheet}
                    />
                    <Animated.View
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: SHEET_H,
                            backgroundColor: cardBg,
                            borderTopLeftRadius: 22,
                            borderTopRightRadius: 22,
                            transform: [{ translateY }],
                            overflow: 'hidden',
                        }}
                    >
                        {/* Drag handle */}
                        <View
                            {...panResponder.panHandlers}
                            style={{ alignItems: 'center', paddingVertical: 14 }}
                        >
                            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: isDark ? '#374151' : '#d1d5db' }} />
                        </View>

                        <CategoryForm
                            isDark={isDark}
                            cardBg={cardBg}
                            textPrimary={textPrimary}
                            textMuted={textMuted}
                            borderColor={borderColor}
                            bgInput={bgInput}
                            accent={accent}
                            editTarget={editTarget}
                            formName={formName}
                            formColor={formColor}
                            formType={formType}
                            saving={saving}
                            onNameChange={setFormName}
                            onColorChange={setFormColor}
                            onTypeChange={setFormType}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            onClose={closeSheet}
                        />
                    </Animated.View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CategoryRow
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryRowProps {
    category: Category;
    cardBg: string;
    textPrimary: string;
    textMuted: string;
    borderColor: string;
    accent: string;
    onPress: () => void;
}

function CategoryRow({ category, cardBg, textPrimary, textMuted, borderColor, accent, onPress }: CategoryRowProps) {
    const dotColor = category.color ?? accent;
    const typeLabel = TYPE_OPTIONS.find(o => o.value === category.type)?.label;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: cardBg,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor,
                gap: 12,
            }}
        >
            <View
                style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: dotColor,
                }}
            />
            <Text style={{ flex: 1, color: textPrimary, fontSize: 15, fontWeight: '500' }}>
                {category.name}
            </Text>
            {typeLabel && typeLabel !== 'Qualquer' && (
                <View
                    style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: `${dotColor}22`,
                    }}
                >
                    <Text style={{ fontSize: 11, color: dotColor, fontWeight: '600' }}>
                        {typeLabel}
                    </Text>
                </View>
            )}
            <Feather name="chevron-right" size={15} color={textMuted} />
        </TouchableOpacity>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CategoryForm
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryFormProps {
    isDark: boolean;
    cardBg: string;
    textPrimary: string;
    textMuted: string;
    borderColor: string;
    bgInput: string;
    accent: string;
    editTarget: Category | null;
    formName: string;
    formColor: string | null;
    formType: string | null;
    saving: boolean;
    onNameChange: (v: string) => void;
    onColorChange: (v: string | null) => void;
    onTypeChange: (v: string | null) => void;
    onSave: () => void;
    onDelete: () => void;
    onClose: () => void;
}

function CategoryForm({
    isDark, textPrimary, textMuted, borderColor, bgInput, accent,
    editTarget, formName, formColor, formType, saving,
    onNameChange, onColorChange, onTypeChange, onSave, onDelete, onClose,
}: CategoryFormProps) {
    const insets = useSafeAreaInsets();
    const isEdit = editTarget !== null;

    return (
        <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: insets.bottom + 16 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 10 }}>
                <Text style={{ flex: 1, color: textPrimary, fontSize: 18, fontWeight: '700' }}>
                    {isEdit ? 'Editar categoria' : 'Nova categoria'}
                </Text>
                {isEdit && (
                    <TouchableOpacity
                        onPress={onDelete}
                        disabled={saving}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Feather name="trash-2" size={19} color="#ef4444" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Name */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Nome *
            </Text>
            <TextInput
                value={formName}
                onChangeText={onNameChange}
                placeholder="Ex: Alimentação"
                placeholderTextColor={textMuted}
                style={{
                    backgroundColor: bgInput,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    color: textPrimary,
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor,
                    marginBottom: 20,
                }}
            />

            {/* Color palette */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Cor
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {/* No color option */}
                <TouchableOpacity
                    onPress={() => onColorChange(null)}
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        borderWidth: 2,
                        borderColor: formColor === null ? accent : (isDark ? '#374151' : '#d1d5db'),
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? '#1e2433' : '#f3f4f8',
                    }}
                >
                    {formColor === null && <Feather name="check" size={14} color={accent} />}
                    {formColor !== null && <Feather name="x" size={12} color={textMuted} />}
                </TouchableOpacity>
                {COLOR_PALETTE.map(c => (
                    <TouchableOpacity
                        key={c}
                        onPress={() => onColorChange(c)}
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: c,
                            borderWidth: 2,
                            borderColor: formColor === c ? '#fff' : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {formColor === c && <Feather name="check" size={14} color="#fff" />}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Type */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Tipo
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
                {TYPE_OPTIONS.map(opt => {
                    const active = formType === opt.value;
                    return (
                        <TouchableOpacity
                            key={String(opt.value)}
                            onPress={() => onTypeChange(opt.value)}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: active ? `${accent}22` : bgInput,
                                borderWidth: 1.5,
                                borderColor: active ? accent : 'transparent',
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? accent : textMuted }}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Footer buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 'auto' }}>
                <TouchableOpacity
                    onPress={onClose}
                    disabled={saving}
                    style={{
                        flex: 1,
                        paddingVertical: 15,
                        borderRadius: 14,
                        alignItems: 'center',
                        backgroundColor: bgInput,
                    }}
                >
                    <Text style={{ color: textMuted, fontSize: 15, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onSave}
                    disabled={saving}
                    style={{
                        flex: 2,
                        paddingVertical: 15,
                        borderRadius: 14,
                        alignItems: 'center',
                        backgroundColor: accent,
                        opacity: saving ? 0.7 : 1,
                    }}
                >
                    {saving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                            {isEdit ? 'Salvar' : 'Criar'}
                        </Text>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
}

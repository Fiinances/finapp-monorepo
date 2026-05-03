package br.com.finapp.dto;

import br.com.finapp.domain.TransactionCategory;
import jakarta.validation.constraints.NotBlank;

public final class CategoryDto {

    private CategoryDto() {
    }

    public static class Request {
        @NotBlank
        public String name;
        public String color;
        public String icon;
        public String type; // 'income' | 'expense'
        public Long parentId;
    }

    public static class Response {
        public Long id;
        public String name;
        public String color;
        public String icon;
        public String type;
        public Long parentId;

        public static Response from(TransactionCategory c) {
            var r = new Response();
            r.id = c.id;
            r.name = c.name;
            r.color = c.color;
            r.icon = c.icon;
            r.type = c.type;
            r.parentId = c.parent != null ? c.parent.id : null;
            return r;
        }
    }
}

package com.planflow.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private UserDto user;
    
    @Data
    @AllArgsConstructor
    public static class UserDto {
        private Long id;
        private String email;
    }
}

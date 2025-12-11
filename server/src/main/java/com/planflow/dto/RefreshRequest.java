package com.planflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshRequest {
    @NotBlank(message = "Refresh token 不能为空")
    private String refreshToken;
}

package com.planflow.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AuthRequest {
    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式无效")
    private String email;
    
    @NotBlank(message = "密码不能为空")
    @Size(min = 8, message = "密码至少需要8个字符")
    private String password;
}

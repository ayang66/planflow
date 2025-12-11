package com.planflow.service;

import com.planflow.dto.AuthRequest;
import com.planflow.dto.AuthResponse;
import com.planflow.entity.RefreshToken;
import com.planflow.entity.User;
import com.planflow.repository.RefreshTokenRepository;
import com.planflow.repository.UserRepository;
import com.planflow.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    
    @Transactional
    public AuthResponse register(AuthRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("邮箱已被注册");
        }
        
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        user = userRepository.save(user);
        
        return generateAuthResponse(user);
    }
    
    @Transactional
    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("邮箱或密码错误"));
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("邮箱或密码错误");
        }
        
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        
        return generateAuthResponse(user);
    }

    
    @Transactional
    public AuthResponse.UserDto refreshAccessToken(String refreshToken) {
        if (!jwtService.validateRefreshToken(refreshToken)) {
            throw new RuntimeException("无效的 refresh token");
        }
        
        RefreshToken tokenEntity = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new RuntimeException("无效的 refresh token"));
        
        if (tokenEntity.getIsRevoked() || tokenEntity.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Refresh token 已过期或已失效");
        }
        
        Long userId = jwtService.getUserIdFromRefreshToken(refreshToken);
        User user = userRepository.findById(userId.intValue())
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        return new AuthResponse.UserDto(user.getId().longValue(), user.getEmail());
    }
    
    public String generateNewAccessToken(Long userId, String email) {
        return jwtService.generateAccessToken(userId, email);
    }
    
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isEmpty()) {
            refreshTokenRepository.revokeByToken(refreshToken);
        }
    }
    
    public User getUserById(Long id) {
        return userRepository.findById(id.intValue()).orElse(null);
    }
    
    private AuthResponse generateAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId().longValue(), user.getEmail());
        String refreshToken = jwtService.generateRefreshToken(user.getId().longValue(), user.getEmail());
        
        // 保存 refresh token
        RefreshToken tokenEntity = new RefreshToken();
        tokenEntity.setUser(user);
        tokenEntity.setToken(refreshToken);
        tokenEntity.setExpiresAt(LocalDateTime.now().plusDays(7));
        tokenEntity.setCreatedAt(LocalDateTime.now());
        tokenEntity.setIsRevoked(false);
        refreshTokenRepository.save(tokenEntity);
        
        return new AuthResponse(
            accessToken,
            refreshToken,
            new AuthResponse.UserDto(user.getId().longValue(), user.getEmail())
        );
    }
}

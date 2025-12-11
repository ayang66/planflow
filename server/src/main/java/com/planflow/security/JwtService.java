package com.planflow.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {
    
    @Value("${jwt.secret}")
    private String secret;
    
    @Value("${jwt.refresh-secret}")
    private String refreshSecret;
    
    @Value("${jwt.access-token-expiry}")
    private long accessTokenExpiry;
    
    @Value("${jwt.refresh-token-expiry}")
    private long refreshTokenExpiry;
    
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    
    private SecretKey getRefreshSigningKey() {
        return Keys.hmacShaKeyFor(refreshSecret.getBytes(StandardCharsets.UTF_8));
    }
    
    public String generateAccessToken(Long userId, String email) {
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiry))
                .signWith(getSigningKey())
                .compact();
    }
    
    public String generateRefreshToken(Long userId, String email) {
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiry))
                .signWith(getRefreshSigningKey())
                .compact();
    }

    
    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return Long.parseLong(claims.getSubject());
    }
    
    public Long getUserIdFromRefreshToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getRefreshSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return Long.parseLong(claims.getSubject());
    }
    
    public boolean validateAccessToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    public boolean validateRefreshToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getRefreshSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    public long getRefreshTokenExpiry() {
        return refreshTokenExpiry;
    }
}

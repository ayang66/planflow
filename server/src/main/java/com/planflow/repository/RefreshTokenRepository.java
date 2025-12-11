package com.planflow.repository;

import com.planflow.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    
    @Modifying
    @Query("UPDATE RefreshToken r SET r.isRevoked = true WHERE r.user.id = :userId")
    void revokeAllByUserId(Long userId);
    
    @Modifying
    @Query("UPDATE RefreshToken r SET r.isRevoked = true WHERE r.token = :token")
    void revokeByToken(String token);
}

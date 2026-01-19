package org.digio.bank.controller;

import lombok.RequiredArgsConstructor;
import org.digio.bank.dto.ResetPassword;
import org.digio.bank.service.PasswordResetService;
import org.digio.entitty.model.Member;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/password")
@RequiredArgsConstructor
public class PasswordController {

    private final PasswordResetService passwordResetService;

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> login(@RequestBody ResetPassword req) {
        try {
            passwordResetService.resetPasswordByEmail(req);
            return ResponseEntity.ok(Map.of("message", "ตั้งรหัสผ่านใหม่สำเร็จ"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }
}

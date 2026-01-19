package org.digio.bank.service;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordService {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public String encode(String rawText) {
        if (rawText == null)
            return null;
        return encoder.encode(rawText);
    }

    public boolean matches(String rawText, String hashedText) {
        if (rawText == null || hashedText == null)
            return false;
        return encoder.matches(rawText, hashedText);
    }
}


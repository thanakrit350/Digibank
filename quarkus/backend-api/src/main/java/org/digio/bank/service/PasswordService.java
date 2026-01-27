package org.digio.bank.service;

import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PasswordService {

    public String encode(String rawText) {
        if (rawText == null) {
            return null;
        }
        return BcryptUtil.bcryptHash(rawText);
    }

    public boolean matches(String rawText, String hashedText) {
        if (rawText == null || hashedText == null) {
            return false;
        }
        return BcryptUtil.matches(rawText, hashedText);
    }
}

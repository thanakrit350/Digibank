package org.digio.bank.dto;

import lombok.Data;

@Data
public class ResetPassword {
    private String email;
    private String pin;
    private String newPassword;
}

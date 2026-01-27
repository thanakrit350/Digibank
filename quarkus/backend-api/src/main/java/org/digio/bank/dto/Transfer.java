package org.digio.bank.dto;

import lombok.Data;

@Data
public class Transfer {
    private String fromAccountId;
    private String toAccountId;
    private Double amount;
    private String pin;
}

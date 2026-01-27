package org.digio.bank.dto;

import lombok.Data;

@Data
public class Withdraw {
    private String accountId;
    private Double amount;
    private String pin;
}

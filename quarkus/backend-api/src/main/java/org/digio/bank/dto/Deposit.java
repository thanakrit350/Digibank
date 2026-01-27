package org.digio.bank.dto;

import lombok.Data;

@Data
public class Deposit {
    private String accountId;
    private Double amount;
}

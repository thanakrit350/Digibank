package org.digio.bank.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class TransactionView {
    private String transientId;
    private Instant transactionDate;
    private String type;
    private Double amount;
    private String status;
    private String fromAccount;
    private String toAccount;
    private String fromAccountName;
    private String toAccountName;
    private String accountId;
}

package org.digio.bank.dto;

import lombok.Data;

import java.util.Calendar;

@Data
public class TransactionView {
    private String transientId;
    private Calendar transactionDate;
    private String type;
    private Double amount;
    private String status;
    private String fromAccount;
    private String toAccount;
    private String fromAccountName;
    private String toAccountName;
    private String accountId;
}

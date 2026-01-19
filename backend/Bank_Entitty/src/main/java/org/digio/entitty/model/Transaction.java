package org.digio.entitty.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Calendar;

@Entity
@Table(name = "transactions")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Transaction {

    @Id
    @Column(name = "transient_id", length = 35, nullable = false)
    private String transientId;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "transaction_date", nullable = false)
    private Calendar transactionDate;

    @Column(name = "type", length = 50, nullable = false)
    private String type;

    @Column(name = "amount", nullable = false)
    private Double amount;

    @Column(name = "confirm_pin", length = 6)
    private String confirmPin;

    @Column(name = "status", length = 50, nullable = false)
    private String status;

    @Column(name = "from_account", length = 50)
    private String fromAccount;

    @Column(name = "to_account", length = 50)
    private String toAccount;

    @ManyToOne
    @JoinColumn(name = "admin_id")
    private Admin admin;

    @ManyToOne
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;
}



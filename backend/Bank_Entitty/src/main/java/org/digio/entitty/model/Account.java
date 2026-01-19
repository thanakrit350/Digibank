package org.digio.entitty.model;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Calendar;

@Entity
@Table(name = "accounts")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Account {

    @Id
    @Column(name = "account_id", length = 18, nullable = false)
    private String accountId;

    @Column(name = "balance", nullable = false)
    private Double balance;

    @Column(name = "status", length = 50, nullable = false)
    private String status;

    @Temporal(TemporalType.DATE)
    @Column(name = "created_date", nullable = false)
    private Calendar createdDate;

    @ManyToOne
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;
}

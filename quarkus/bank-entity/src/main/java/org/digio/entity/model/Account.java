package org.digio.entity.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "accounts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {

    @Id
    @Column(name = "account_id", length = 18, nullable = false)
    public String accountId;

    @Column(nullable = false)
    public Double balance;

    @Column(length = 50, nullable = false)
    public String status;

    @Column(name = "created_date", nullable = false)
    public Instant createdDate;

    @ManyToOne
    @JoinColumn(name = "member_id", nullable = false)
    public Member member;
}

package org.digio.bank.repository;


import org.digio.entitty.model.Transaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, String> {
    List<Transaction> findByAccount_AccountId(String accountId);
}

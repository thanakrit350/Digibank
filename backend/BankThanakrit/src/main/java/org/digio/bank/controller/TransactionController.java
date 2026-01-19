package org.digio.bank.controller;

import lombok.RequiredArgsConstructor;
import org.digio.bank.dto.Deposit;
import org.digio.bank.dto.TransactionView;
import org.digio.bank.dto.Transfer;
import org.digio.bank.dto.Withdraw;
import org.digio.entitty.model.Transaction;
import org.digio.bank.service.TransactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public ResponseEntity<List<TransactionView>> getAllTransactions() {
        return ResponseEntity.ok(transactionService.getAllTransactions());
    }

    @GetMapping("/{transactionId}")
    public ResponseEntity<Transaction> getTransactionById(@PathVariable String transactionId) {
        Transaction transaction = transactionService.getTransactionById(transactionId);
        return transaction != null ? ResponseEntity.ok(transaction) : ResponseEntity.notFound().build();
    }

    @GetMapping("/account/{accountId}")
    public ResponseEntity<List<Transaction>> getByAccount(@PathVariable String accountId) {
        return ResponseEntity.ok(transactionService.getByAccountId(accountId));
    }

    @PostMapping
    public ResponseEntity<Transaction> addTransaction(@RequestBody Transaction request) {
        Transaction created = transactionService.createTransaction(request);
        return ResponseEntity.ok(created);
    }
    @PostMapping("/deposit")
    public ResponseEntity<Transaction> deposit(@RequestBody Deposit request) {
        Transaction deposit = transactionService.deposit(request);
        return ResponseEntity.ok(deposit);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<Transaction> withdraw(@RequestBody Withdraw request) {
        Transaction withdraw = transactionService.withdraw(request);
        return ResponseEntity.ok(withdraw);
    }

    @PostMapping("/transfer")
    public ResponseEntity<Transaction> transfer(@RequestBody Transfer request) {
        Transaction transfer = transactionService.transfer(request);
        return ResponseEntity.ok(transfer);
    }

    @PostMapping("/{transactionId}/pdf")
    public ResponseEntity<Void> exportTransactionPdf(@PathVariable String transactionId) {
        transactionService.exportTransactionPdf(transactionId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{transactionId}")
    public ResponseEntity<Transaction> updateTransaction(
            @PathVariable String transactionId,
            @RequestBody Transaction request
    ) {
        Transaction updated = transactionService.updateTransaction(transactionId, request);
        return updated != null
                ? ResponseEntity.ok(updated)
                : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{transactionId}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable String transactionId) {
        boolean deleted = transactionService.deleteTransaction(transactionId);
        return deleted
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}

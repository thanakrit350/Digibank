package org.digio.bank.controller;

import lombok.RequiredArgsConstructor;
import org.digio.bank.dto.OpenAccount;
import org.digio.entitty.model.Account;
import org.digio.bank.service.AccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping
    public ResponseEntity<List<Account>> getAllAccounts() {

        return ResponseEntity.ok(accountService.getAllAccounts());
    }

    @GetMapping("/{accountId}")
    public ResponseEntity<Account> getAccountById(@PathVariable String accountId) {
        Account account = accountService.getAccountById(accountId);
        return account != null ? ResponseEntity.ok(account) : ResponseEntity.notFound().build();
    }

    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<Account>> getAccountsByMember(@PathVariable String memberId) {
        return ResponseEntity.ok(accountService.getAccountsByMember(memberId));
    }

    @PostMapping
    public ResponseEntity<Account> addAccount(@RequestBody OpenAccount request) {
        Account created = accountService.createAccount(request);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{accountId}")
    public ResponseEntity<Account> updateAccount(@PathVariable String accountId, @RequestBody Account update) {
        Account updated = accountService.updateAccount(accountId, update);
        return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{accountId}")
    public ResponseEntity<Void> removeAccount(@PathVariable String accountId) {
        boolean deleted = accountService.deleteAccount(accountId);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}

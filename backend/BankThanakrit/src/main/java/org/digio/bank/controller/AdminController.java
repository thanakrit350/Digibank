package org.digio.bank.controller;

import lombok.RequiredArgsConstructor;
import org.digio.bank.dto.AdminLogin;
import org.digio.entitty.model.Account;
import org.digio.entitty.model.Transaction;
import org.digio.entitty.model.Admin;
import org.digio.bank.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admins")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @PostMapping("/login")
    public ResponseEntity<Admin> login(@RequestBody AdminLogin request) {
        Admin login = adminService.adminLogin(request);
        return ResponseEntity.ok(login);
    }

    @PostMapping("/accounts/{accountId}/status")
    public ResponseEntity<Account> updateAccountStatus(@PathVariable String accountId, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        Account updated = adminService.updateAccountStatus(accountId, status);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/transactions/{transactionId}/cancel")
    public ResponseEntity<Transaction> cancelTransaction( @PathVariable String transactionId) {
        Transaction canceled = adminService.cancelTransaction(transactionId);
        return ResponseEntity.ok(canceled);
    }
}

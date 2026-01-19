package org.digio.bank.service;

import lombok.RequiredArgsConstructor;
import org.digio.bank.dto.AdminLogin;
import org.digio.entitty.model.Account;
import org.digio.entitty.model.Transaction;
import org.digio.entitty.model.Admin;
import org.digio.bank.repository.AccountRepository;
import org.digio.bank.repository.AdminRepository;
import org.digio.bank.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final AdminRepository adminRepository;
    private final PasswordService passwordService;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    public Admin adminLogin(AdminLogin req) {
        List<Admin> admins = adminRepository.findByUsername(req.getUsername());
        if (admins.isEmpty()) {
            throw new IllegalArgumentException("ไม่พบผู้ดูแลระบบ");
        }
        Admin admin = admins.get(0);
        boolean match;
        if (passwordService != null) {
            match = passwordService.matches(req.getPassword(), admin.getPassword());
        } else {
            match = admin.getPassword().equals(req.getPassword());
        }
        if (!match) {
            throw new IllegalArgumentException("รหัสผ่านไม่ถูกต้อง");
        }
        return admin;
    }

    //อายัด
    public Account updateAccountStatus(String accountId, String status) {
        return accountRepository.findById(accountId)
                .map(acc -> {
                    acc.setStatus(status);
                    return accountRepository.save(acc);
                })
                .orElseThrow(() -> new RuntimeException("ไม่พบบัญชีเลขที่ " + accountId));
    }

    //ยกเลิกธุรกรรม
    public Transaction cancelTransaction(String transactionId) {
        Transaction t = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("ไม่พบรายการธุรกรรม " + transactionId));
        t.setStatus("ยกเลิก");
        return transactionRepository.save(t);
    }

}

package org.digio.bank.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.digio.bank.dto.AdminLogin;
import org.digio.bank.repository.AccountRepository;
import org.digio.bank.repository.AdminRepository;
import org.digio.bank.repository.TransactionRepository;
import org.digio.entity.model.Account;
import org.digio.entity.model.Admin;
import org.digio.entity.model.Transaction;

import java.util.List;

@ApplicationScoped
public class AdminService {

    private final AdminRepository adminRepository;
    private final PasswordService passwordService;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private static final String DEPOSIT_TYPE = "ฝากเงิน";
    private static final String TRANSFER_TYPE = "โอนเงิน";
    private static final String RECEIVE_TYPE = "รับเงิน";
    private static final String WITHDRAW_TYPE = "ถอนเงิน";
    private static final String CANCELED_STATUS = "ยกเลิก";
    private static final String ACCOUNT_ID = "accountId";

    public AdminService(AdminRepository adminRepository, PasswordService passwordService, AccountRepository accountRepository, TransactionRepository transactionRepository) {
        this.adminRepository = adminRepository;
        this.passwordService = passwordService;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
    }

    public Admin adminLogin(AdminLogin req) {
        List<Admin> admins = adminRepository.find("username", req.getUsername()).list();
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

    @Transactional
    public Account updateAccountStatus(String accountId, String status) {
        Account account = accountRepository.find(ACCOUNT_ID, accountId).firstResult();
        if (account == null) {
            throw new IllegalArgumentException("ไม่พบบัญชีเลขที่ " + accountId);
        }
        account.setStatus(status);
        accountRepository.persist(account);
        return account;
    }

    @Transactional
    public Transaction cancelTransaction(String transientId) {
        Transaction t = transactionRepository.find("transientId", transientId).firstResult();
        validateTransactionFound(t);
        ensureNotCanceled(t);
        ensureHasAccount(t);

        String type = t.getType();
        double absAmount = Math.abs(t.getAmount());

        if (DEPOSIT_TYPE.equals(type)) return cancelDeposit(t, absAmount);
        if (WITHDRAW_TYPE.equals(type)) return cancelWithdraw(t, absAmount);
        if (TRANSFER_TYPE.equals(type) || RECEIVE_TYPE.equals(type)) return cancelTransferOrReceive(t, absAmount, type);

        throw new IllegalStateException("ไม่รองรับการยกเลิกรายการประเภทนี้");
    }

    private void validateTransactionFound(Transaction t) {
        if (t == null) throw new IllegalArgumentException("ไม่พบรายการธุรกรรม");
    }

    private void ensureNotCanceled(Transaction t) {
        if (CANCELED_STATUS.equals(t.getStatus())) {
            throw new IllegalStateException("รายการนี้ถูกยกเลิกไปแล้ว");
        }
    }

    private void ensureHasAccount(Transaction t) {
        if (t.getAccount() == null) throw new IllegalStateException("ไม่พบบัญชีที่เกี่ยวข้อง");
    }

    private Transaction cancelDeposit(Transaction t, double absAmount) {
        Account acc = t.getAccount();
        acc.setBalance(acc.getBalance() - absAmount);
        t.setStatus(CANCELED_STATUS);
        return t;
    }

    private Transaction cancelWithdraw(Transaction t, double absAmount) {
        Account acc = t.getAccount();
        acc.setBalance(acc.getBalance() + absAmount);
        t.setStatus(CANCELED_STATUS);
        return t;
    }

    private Transaction cancelTransferOrReceive(Transaction t, double absAmount, String type) {
        String fromId = t.getFromAccount();
        String toId = t.getToAccount();
        if (fromId == null || toId == null) {
            throw new IllegalStateException("ข้อมูลบัญชีต้นทาง/ปลายทางไม่ครบ");
        }

        Account fromAccount = accountRepository.find(ACCOUNT_ID, fromId).firstResult();
        Account toAccount = accountRepository.find(ACCOUNT_ID, toId).firstResult();
        if (fromAccount == null || toAccount == null) {
            throw new IllegalStateException("ไม่พบบัญชีต้นทางหรือปลายทาง");
        }

        String otherType = TRANSFER_TYPE.equals(type) ? RECEIVE_TYPE : TRANSFER_TYPE;

        Transaction pair = transactionRepository.find(
                "type = ?1 and status <> 'ยกเลิก' and fromAccount = ?2 and toAccount = ?3 and ABS(amount) = ?4",
                otherType, fromId, toId, absAmount
        ).firstResult();

        if (pair == null) {
            throw new IllegalStateException("ไม่พบรายการคู่ของการโอน (โอน/รับ) ไม่สามารถยกเลิกได้");
        }

        if (CANCELED_STATUS.equals(pair.getStatus())) {
            throw new IllegalStateException("รายการคู่ถูกยกเลิกไปแล้ว");
        }

        fromAccount.setBalance(fromAccount.getBalance() + absAmount);
        toAccount.setBalance(toAccount.getBalance() - absAmount);

        t.setStatus(CANCELED_STATUS);
        pair.setStatus(CANCELED_STATUS);

        return t;
    }

}

package org.digio.bank.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.digio.bank.dto.Deposit;
import org.digio.bank.dto.TransactionView;
import org.digio.bank.dto.Transfer;
import org.digio.bank.dto.Withdraw;
import org.digio.entitty.model.Account;
import org.digio.entitty.model.Member;
import org.digio.entitty.model.Transaction;
import org.digio.bank.repository.AccountRepository;
import org.digio.bank.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.Calendar;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final PasswordService passwordService;
    private final PdfService pdfService;
    private final MailService mailService;

    private static final SecureRandom RANDOM = new SecureRandom();

    private static final String STATUS_OPEN  = "เปิดใช้งาน";
    private static final String TRANSACTION_SUCCESS = "สำเร็จ";
    private static final String DEPOSIT_TYPE = "ฝากเงิน";
    private static final String TRANSFER_TYPE = "โอนเงิน";
    private static final String RECEIVE_TYPE = "รับเงิน";
    private static final String WITHDRAW_TYPE = "ถอนเงิน";


    public List<TransactionView> getAllTransactions() {
        List<Transaction> list = transactionRepository.findAll();
        return list.stream()
                .map(this::toView)
                .toList();
    }

    private TransactionView toView(Transaction t) {
        TransactionView v = new TransactionView();
        v.setTransientId(t.getTransientId());
        v.setTransactionDate(t.getTransactionDate());
        v.setType(t.getType());
        v.setAmount(t.getAmount());
        v.setStatus(t.getStatus());
        v.setFromAccount(t.getFromAccount());
        v.setToAccount(t.getToAccount());
        v.setFromAccountName(getAccountName(t.getFromAccount()));
        v.setToAccountName(getAccountName(t.getToAccount()));
        v.setAccountId(t.getAccount() != null ? t.getAccount().getAccountId() : null);
        return v;
    }

    public void exportTransactionPdf(String transactionId) {
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("ไม่พบรายการธุรกรรม"));

        TransactionView view = toView(tx);

        String rawAccountId = tx.getAccount().getAccountId();
        String normalizedAccountId = normalizeAccount(rawAccountId);

        if (normalizedAccountId.length() < 4) {
            throw new IllegalStateException("เลขบัญชีไม่ถูกต้อง");
        }

        String pdfPassword = normalizedAccountId.substring(normalizedAccountId.length() - 4);
        String email = tx.getAccount().getMember().getEmail();
        try {
            byte[] pdfBytes = pdfService.generateTransactionPdf(view, pdfPassword);
            mailService.sendTransactionPdf(email, pdfBytes, view.getTransientId());

        } catch (IOException e) {
            throw new IllegalArgumentException("สร้าง PDF ไม่สำเร็จ", e);
        }

        log.info("ส่ง PDF transaction {}", transactionId);
        log.info("ส่ง PDF ถึง {}", email);
    }

    private String getAccountName(String accountId) {
        if (accountId == null || accountId.isBlank()) return null;
        String normalizedId = normalizeAccount(accountId);
        return accountRepository.findById(normalizedId)
                .map(acc -> acc.getMember().getFirstNameTh() + " " + acc.getMember().getLastNameTh())
                .orElse(null);
    }

    public Transaction getTransactionById(String id) {

        return transactionRepository.findById(id).orElse(null);
    }

    public List<Transaction> getByAccountId(String accountId) {
        return transactionRepository.findByAccount_AccountId(accountId);
    }

    public Transaction createTransaction(Transaction req) {
        Transaction t = Transaction.builder()
                .transientId(generateTransactionId())
                .transactionDate(Calendar.getInstance())
                .type(req.getType())
                .amount(req.getAmount())
                .confirmPin(req.getConfirmPin())
                .status(req.getStatus())
                .fromAccount(req.getFromAccount())
                .toAccount(req.getToAccount())
                .admin(req.getAdmin())
                .account(req.getAccount())
                .build();

        return transactionRepository.save(t);
    }

    private String generateTransactionId() {
        String t1 = String.format("%08d", RANDOM.nextInt(100000000));

        String letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        StringBuilder t2 = new StringBuilder();
        for (int i = 0; i < 3; i++) {
            t2.append(letters.charAt(RANDOM.nextInt(letters.length())));
        }
        String t3 = String.format("%05d", RANDOM.nextInt(100000));

        return t1 + t2 + t3;
    }

    public Transaction deposit(Deposit req) {
        if (req.getAmount() == null || req.getAmount() <= 0) {
            throw new IllegalArgumentException("จำนวนเงินฝากต้องมากกว่า 0");
        }

        Account account = accountRepository.findById(req.getAccountId())
                .orElseThrow(() -> new RuntimeException("ไม่พบบัญชีเลขที่ " + req.getAccountId()));

        if (!STATUS_OPEN .equalsIgnoreCase(account.getStatus())) {
            throw new IllegalArgumentException("ไม่สามารถทำรายการได้ บัญชีไม่ได้อยู่ในสถานะปกติ");
        }

        double newBalance = account.getBalance() + req.getAmount();
        account.setBalance(newBalance);
        accountRepository.save(account);

        Transaction transaction = Transaction.builder()
                .transientId(generateTransactionId())
                .transactionDate(Calendar.getInstance())
                .type(DEPOSIT_TYPE)
                .amount(req.getAmount())
                .confirmPin(null)
                .status(TRANSACTION_SUCCESS)
                .fromAccount(null)
                .toAccount(account.getAccountId())
                .admin(null)
                .account(account)
                .build();

        return transactionRepository.save(transaction);
    }

    public Transaction withdraw(Withdraw req) {
        Account account = accountRepository.findById(req.getAccountId())
                .orElseThrow(() -> new RuntimeException("ไม่พบบัญชีเลขที่" + req.getAccountId()));

        if (!STATUS_OPEN .equalsIgnoreCase(account.getStatus())) {
            throw new IllegalArgumentException("ไม่สามารถทำรายการได้ บัญชีไม่ได้อยู่ในสถานะปกติ");
        }

        Member member = account.getMember();
        if (member == null) {
            throw new IllegalArgumentException("ไม่มีผู้ใช้บัญชีเลขที่" + req.getAccountId());
        }

        if (req.getPin() == null || req.getPin().isBlank()) {
            throw new IllegalArgumentException("กรุณากรอก PIN");
        }

        if (!passwordService.matches(req.getPin(), member.getPin())) {
            throw new IllegalArgumentException("PIN ไม่ถูกต้อง");
        }

        if (req.getAmount() == null || req.getAmount() <= 0) {
            throw new IllegalArgumentException("จำนวนเงินต้องมากกว่า 0");
        }

        if (account.getBalance() < req.getAmount()) {
            throw new IllegalArgumentException("ยอดเงินในบัญชีไม่เพียงพอ");
        }

        double newBalance = account.getBalance() - req.getAmount();
        account.setBalance(newBalance);
        accountRepository.save(account);

        Calendar now = Calendar.getInstance();

        Transaction t = Transaction.builder()
                .transientId(generateTransactionId())
                .transactionDate(now)
                .type(WITHDRAW_TYPE)
                .amount(-req.getAmount())
                .status(TRANSACTION_SUCCESS)
                .fromAccount(account.getAccountId())
                .toAccount(null)
                .account(account)
                .build();

        return transactionRepository.save(t);
    }

    private String normalizeAccount(String input) {
        return input.replaceAll("\\D", "");
    }

    public Transaction transfer(Transfer req) {
        String inputFrom = normalizeAccount(req.getFromAccountId());
        String inputTo = normalizeAccount(req.getToAccountId());
        
        Account from = accountRepository.findAll().stream()
                .filter(a -> normalizeAccount(a.getAccountId()).equals(inputFrom))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("ไม่พบบัญชีต้นทาง"));

        Account to = accountRepository.findAll().stream()
                .filter(a -> normalizeAccount(a.getAccountId()).equals(inputTo))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("ไม่พบบัญชีปลายทาง"));

        if (!STATUS_OPEN .equalsIgnoreCase(from.getStatus())) {
            throw new IllegalArgumentException("บัญชีต้นทางไม่ได้อยู่ในสถานะปกติ");
        }

        if (!STATUS_OPEN .equalsIgnoreCase(to.getStatus())) {
            throw new IllegalArgumentException("บัญชีปลายทางไม่ได้อยู่ในสถานะปกติ");
        }

        if (!passwordService.matches(req.getPin(), from.getMember().getPin())) {
            throw new IllegalArgumentException("PIN ไม่ถูกต้อง");
        }

        if (from.getBalance() < req.getAmount()) {
            throw new IllegalArgumentException("ยอดเงินในบัญชีไม่เพียงพอ");
        }

        double amount = req.getAmount();
        //อัปเดตยอดเงินทั้ง 2 บัญชี
        from.setBalance(from.getBalance() - amount);
        to.setBalance(to.getBalance() + amount);
        accountRepository.save(from);
        accountRepository.save(to);

        Calendar now = Calendar.getInstance();
        //โอนเงิน
        Transaction tOut = Transaction.builder()
                .transientId(generateTransactionId())
                .transactionDate(now)
                .type(TRANSFER_TYPE)
                .amount(-amount)
                .confirmPin(req.getPin())
                .status(TRANSACTION_SUCCESS)
                .fromAccount(from.getAccountId())
                .toAccount(to.getAccountId())
                .account(from)
                .build();
        //รับเงิน
        Transaction tIn = Transaction.builder()
                .transientId(generateTransactionId())
                .transactionDate(now)
                .type(RECEIVE_TYPE)
                .amount(amount)
                .confirmPin(null)
                .status(TRANSACTION_SUCCESS)
                .fromAccount(from.getAccountId())
                .toAccount(to.getAccountId())
                .account(to)
                .build();

        transactionRepository.save(tIn);
        return transactionRepository.save(tOut);
    }

    public void autoTransferEx() {
        String fromAccountId = "431-7-99003-6";
        String toAccountId   = "883-1-93408-4";
        double amount        = 10.0;
        String pin     = "123456";

        Transfer req = new Transfer();
        req.setFromAccountId(fromAccountId);
        req.setToAccountId(toAccountId);
        req.setAmount(amount);
        req.setPin(pin);

        try {
            Account from = accountRepository.findById(req.getFromAccountId())
                    .orElseThrow(() -> new RuntimeException("ไม่พบบัญชีต้นทาง"));
            Account to = accountRepository.findById(req.getToAccountId())
                    .orElseThrow(() -> new RuntimeException("ไม่พบบัญชีปลายทาง"));

            Transaction tx = transfer(req);

            log.info("โอนเงินสำเร็จ: จาก บช {} ถึง บช {}, จำนวน = {}, เลขอ้างอิง = {}",
                    from.getMember().getFirstNameTh(), to.getMember().getFirstNameTh(),
                    amount, tx.getTransientId());
        } catch (RuntimeException e) {
            log.warn("โอนเงินไม่สำเร็จ!!!: {}", e.getMessage());

        }
    }

    public Transaction updateTransaction(String id, Transaction req) {
        return transactionRepository.findById(id)
                .map(existing -> {

                    existing.setTransactionDate(req.getTransactionDate());
                    existing.setType(req.getType());
                    existing.setAmount(req.getAmount());
                    existing.setConfirmPin(req.getConfirmPin());
                    existing.setStatus(req.getStatus());
                    existing.setFromAccount(req.getFromAccount());
                    existing.setToAccount(req.getToAccount());
                    existing.setAdmin(req.getAdmin());
                    existing.setAccount(req.getAccount());

                    return transactionRepository.save(existing);
                })
                .orElse(null);
    }

    public boolean deleteTransaction(String id) {
        if (!transactionRepository.existsById(id)) {
            return false;
        }
        transactionRepository.deleteById(id);
        return true;
    }



}

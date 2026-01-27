package org.digio.bank.service;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.digio.bank.dto.Deposit;
import org.digio.bank.dto.TransactionView;
import org.digio.bank.dto.Transfer;
import org.digio.bank.dto.Withdraw;
import org.digio.bank.repository.AccountRepository;
import org.digio.bank.repository.TransactionRepository;
import org.digio.entity.model.Account;
import org.digio.entity.model.Member;
import org.digio.entity.model.Transaction;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;

@ApplicationScoped
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final PasswordService passwordService;
    private static final SecureRandom RANDOM = new SecureRandom();
    private final PdfService pdfService;
    private final MailService mailService;


    private static final String STATUS_OPEN  = "เปิดใช้งาน";
    private static final String TRANSACTION_SUCCESS = "สำเร็จ";
    private static final String DEPOSIT_TYPE = "ฝากเงิน";
    private static final String TRANSFER_TYPE = "โอนเงิน";
    private static final String RECEIVE_TYPE = "รับเงิน";
    private static final String WITHDRAW_TYPE = "ถอนเงิน";
    private static final String TRANSACTION_ID = "transientId";
    private static final String ACCOUNT_ID = "accountId";

    public TransactionService(TransactionRepository transactionRepository,
                              AccountRepository accountRepository,
                              PasswordService passwordService,
                              PdfService pdfService,
                              MailService mailService
    ) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.passwordService = passwordService;
        this.pdfService = pdfService;
        this.mailService = mailService;
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

    private String getAccountName(String accountId) {
        if (accountId == null || accountId.isBlank()) return null;
        String normalizedId = normalizeAccount(accountId);
        Account account = accountRepository.find(ACCOUNT_ID, normalizedId).firstResult();
        return account != null ? account.getMember().getFirstNameTh()+" "+account.getMember().getLastNameTh() : null;
    }

    private String normalizeAccount(String input) {
        return input.replaceAll("\\D", "");
    }

    public List<TransactionView> getAllTransactions() {
        List<Transaction> transactions = transactionRepository.listAll();
        return transactions.stream().map(this::toView).toList();
    }

    public Transaction getTransactionById(String transactionId) {
        return transactionRepository.find(TRANSACTION_ID, transactionId).firstResult();
    }

    public List<Transaction> getByAccountId(String accountId) {
        Log.info("Get transactions for accountId: " + accountId);
        return transactionRepository.find("account.accountId", accountId).list();
    }



    @Transactional
    public Transaction createTransaction(Transaction request) {
        transactionRepository.persist(request);
        return request;
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

    @Transactional
    public Transaction deposit(Deposit req) {
        if (req.getAmount() == null || req.getAmount() <= 0) {
            throw new IllegalArgumentException("จำนวนเงินฝากต้องมากกว่า 0");
        }
        Account account = accountRepository.find(ACCOUNT_ID, req.getAccountId()).firstResult();
        Log.info("Deposit to account: " + account);
        if (!STATUS_OPEN .equalsIgnoreCase(account.getStatus())) {
            throw new IllegalArgumentException("ไม่สามารถทำรายการได้ บัญชีไม่ได้อยู่ในสถานะปกติ");
        }
        double newBalance = account.getBalance() + req.getAmount();
        account.setBalance(newBalance);
        accountRepository.persist(account);

        Transaction transaction = Transaction.builder()
                .transientId(generateTransactionId())
                .transactionDate(Instant.now())
                .type(DEPOSIT_TYPE)
                .amount(req.getAmount())
                .confirmPin(null)
                .status(TRANSACTION_SUCCESS)
                .fromAccount(null)
                .toAccount(req.getAccountId())
                .admin(null)
                .account(account)
                .build();

        transactionRepository.persist(transaction);
        return transaction;
    }

    @Transactional
    public Transaction withdraw(Withdraw req) {
        Account account = accountRepository.find(ACCOUNT_ID, req.getAccountId()).firstResult();
        if (account == null) {
            throw new IllegalArgumentException("ไม่พบบัญชี");
        }

        if (!STATUS_OPEN .equalsIgnoreCase(account.getStatus())) {
            throw new IllegalArgumentException("ไม่สามารถทำรายการได้ บัญชีไม่ได้อยู่ในสถานะปกติ");
        }

        Member member = account.getMember();
        if (member == null) {
            throw new IllegalArgumentException("ไม่พบเจ้าของบัญชี");
        }

        if (req.getPin() == null || req.getPin().isBlank()) {
            throw new IllegalArgumentException("กรุณากรอก PIN");
        }

        if (!passwordService.matches(req.getPin(), account.getMember().getPin())) {
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
        accountRepository.persist(account);

        Transaction transaction = Transaction.builder()
                .transientId(generateTransactionId())
                .transactionDate(Instant.now())
                .type(WITHDRAW_TYPE)
                .amount(-req.getAmount())
                .confirmPin(req.getPin())
                .status(TRANSACTION_SUCCESS)
                .fromAccount(req.getAccountId())
                .toAccount(null)
                .admin(null)
                .account(account)
                .build();
        transactionRepository.persist(transaction);
        return transaction;
    }

    @Transactional
    public Transaction transfer(Transfer req) {
        Account fromAccount = accountRepository.find(ACCOUNT_ID, req.getFromAccountId()).firstResult();
        if (fromAccount == null) {
            throw new IllegalArgumentException("ไม่พบบัญชีต้นทาง");
        }

        if (!STATUS_OPEN.equalsIgnoreCase(fromAccount.getStatus())) {
            throw new IllegalArgumentException("ไม่สามารถทำรายการได้ บัญชีต้นทางไม่ได้อยู่ในสถานะปกติ");
        }

        Member member = fromAccount.getMember();
        if (member == null) {
            throw new IllegalArgumentException("ไม่พบเจ้าของบัญชีต้นทาง");
        }

        if (req.getPin() == null || req.getPin().isBlank()) {
            throw new IllegalArgumentException("กรุณากรอก PIN");
        }

        if (!passwordService.matches(req.getPin(), fromAccount.getMember().getPin())) {
            throw new IllegalArgumentException("PIN ไม่ถูกต้อง");
        }

        Account toAccount = accountRepository.find(ACCOUNT_ID, req.getToAccountId()).firstResult();
        if (toAccount == null) {
            throw new IllegalArgumentException("ไม่พบบัญชีปลายทาง");
        }

        if (!STATUS_OPEN.equalsIgnoreCase(toAccount.getStatus())) {
            throw new IllegalArgumentException("ไม่สามารถทำรายการได้ บัญชีปลายทางไม่ได้อยู่ในสถานะปกติ");
        }

        if (req.getAmount() == null || req.getAmount() <= 0) {
            throw new IllegalArgumentException("จำนวนเงินต้องมากกว่า 0");
        }

        if (fromAccount.getBalance() < req.getAmount()) {
            throw new IllegalArgumentException("ยอดเงินในบัญชีต้นทางไม่เพียงพอ");
        }

        double newFromBalance = fromAccount.getBalance() - req.getAmount();
        fromAccount.setBalance(newFromBalance);
        accountRepository.persist(fromAccount);

        double newToBalance = toAccount.getBalance() + req.getAmount();
        toAccount.setBalance(newToBalance);
        accountRepository.persist(toAccount);

        Transaction tOut = Transaction.builder()
                .transientId(generateTransactionId())
                .transactionDate(Instant.now())
                .type(TRANSFER_TYPE)
                .amount(-req.getAmount())
                .confirmPin(req.getPin())
                .status(TRANSACTION_SUCCESS)
                .fromAccount(req.getFromAccountId())
                .toAccount(req.getToAccountId())
                .admin(null)
                .account(fromAccount)
                .build();
        transactionRepository.persist(tOut);

        Transaction tIn = Transaction.builder()
                .transientId(generateTransactionId())
                .transactionDate(Instant.now())
                .type(RECEIVE_TYPE)
                .amount(req.getAmount())
                .confirmPin(null)
                .status(TRANSACTION_SUCCESS)
                .fromAccount(req.getFromAccountId())
                .toAccount(req.getToAccountId())
                .admin(null)
                .account(toAccount)
                .build();
        transactionRepository.persist(tIn);
        return tOut;
    }

    @Transactional
    public Transaction updateTransaction(String transactionId, Transaction update) {
        Transaction existing = transactionRepository.find(TRANSACTION_ID, transactionId).firstResult();
        if (existing == null) {
            return null;
        }
        existing.setTransactionDate(update.getTransactionDate());
        existing.setType(update.getType());
        existing.setAmount(update.getAmount());
        existing.setConfirmPin(update.getConfirmPin());
        existing.setStatus(update.getStatus());
        existing.setFromAccount(update.getFromAccount());
        existing.setToAccount(update.getToAccount());
        existing.setAdmin(update.getAdmin());
        existing.setAccount(update.getAccount());
        return existing;
    }

    @Transactional
    public boolean deleteTransaction(String transactionId) {
        return transactionRepository.delete(TRANSACTION_ID, transactionId) > 0;
    }

    @Transactional
    public void exportTransactionPdf(String transactionId) {
        Transaction tx = transactionRepository.find(TRANSACTION_ID, transactionId).firstResult();
        if (tx == null) {
            throw new IllegalStateException("ไม่พบรายการธุรกรรม");
        }

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

        Log.info("ส่ง PDF transaction " + transactionId);
        Log.info("ส่ง PDF ถึง " + email);
    }
}

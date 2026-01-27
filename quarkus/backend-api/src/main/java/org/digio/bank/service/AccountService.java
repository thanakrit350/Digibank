package org.digio.bank.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import org.digio.bank.dto.OpenAccount;
import org.digio.bank.repository.AccountRepository;
import org.digio.bank.repository.MemberRepository;
import org.digio.bank.repository.TransactionRepository;
import org.digio.entity.model.Account;
import org.digio.entity.model.Member;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;

@ApplicationScoped
public class AccountService {

    private final AccountRepository accountRepository;
    private final MemberRepository memberRepository;
    private final PasswordService passwordService;
    private final TransactionRepository transactionRepository;
    private static final String ACCOUNT_ID = "accountId";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Inject
    public AccountService(AccountRepository accountRepository,
                          MemberRepository memberRepository,
                          PasswordService passwordService ,
                          TransactionRepository transactionRepository
    ) {
        this.accountRepository = accountRepository;
        this.memberRepository = memberRepository;
        this.passwordService = passwordService;
        this.transactionRepository = transactionRepository;
    }

    public List<Account> getAllAccounts() {
        return accountRepository.listAll();
    }

    public Account getAccountById(Long accountId) {
        return accountRepository.findById(accountId);
    }

    public List<Account> getAccountsByMember(Long memberId) {
        return accountRepository.find("member.memberId", memberId).list();
    }

    @Transactional
    public Account createAccount(OpenAccount req) {
        Member member = memberRepository.findById(req.getMemberId());
        if (member == null) {
            throw new IllegalArgumentException("ไม่พบสมาชิก");
        }

        if (!passwordService.matches(req.getPin(), member.getPin())) {
            throw new IllegalArgumentException("PIN ไม่ถูกต้อง");
        }

        Account account = Account.builder()
                .accountId(generateAccountId())
                .balance(0.00)
                .status("เปิดใช้งาน")
                .createdDate(Instant.now())
                .member(member)
                .build();

        accountRepository.persist(account);
        return account;
    }

    @Transactional
    public Account updateAccount(Long accountId, Account update) {

        Account existing = accountRepository.findById(accountId);
        if (existing == null) {
            return null;
        }

        existing.balance = update.balance;
        existing.status = update.status;
        existing.createdDate = update.createdDate;
        existing.member = update.member;

        return existing;
    }

    @Transactional
    public boolean deleteAccount(String accountId) {
        Account acc = accountRepository.find(ACCOUNT_ID, accountId).firstResult();
        if (acc == null)
            return false;

        if (acc.getBalance() == null || acc.getBalance() > 0) {
            throw new IllegalArgumentException("ไม่สามารถลบบัญชีที่มีเงินคงเหลือ");
        }

        transactionRepository.delete("account.accountId", accountId);
        accountRepository.delete(acc);
        return true;
    }

    private String generateAccountId() {
        String a1 = String.format("%03d", RANDOM.nextInt(1000));
        String a2 = String.format("%01d", RANDOM.nextInt(10));
        String a3 = String.format("%05d", RANDOM.nextInt(100000));
        String raw = a1 + a2 + a3;

        int sum = 0;
        for (char c : raw.toCharArray()) {
            sum += Character.getNumericValue(c);
        }

        int checksum = sum % 10;
        return a1 + "-" + a2 + "-" + a3 + "-" + checksum;
    }
}

package org.digio.bank.service;

import lombok.RequiredArgsConstructor;
import org.digio.bank.dto.OpenAccount;
import org.digio.entitty.model.Account;
import org.digio.entitty.model.Member;
import org.digio.bank.repository.AccountRepository;
import org.digio.bank.repository.MemberRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Calendar;
import java.util.List;


@Service
@RequiredArgsConstructor
public class AccountService {


    private final AccountRepository accountRepository;
    private final PasswordService passwordService;
    private final MemberRepository memberRepository;
    private static final SecureRandom RANDOM = new SecureRandom();

    public List<Account> getAllAccounts() {
        return accountRepository.findAll();
    }

    public Account getAccountById(String accountId) {
        return accountRepository.findById(accountId).orElse(null);
    }

    public List<Account> getAccountsByMember(String memberId) {
        return accountRepository.findByMember_MemberId(memberId);
    }

    public Account createAccount(OpenAccount req) {
        Member member = memberRepository.findById(req.getMemberId())
                .orElseThrow(() -> new RuntimeException("ไม่พบสมาชิก"));

        if (!passwordService.matches(req.getPin(), member.getPin())) {
            throw new IllegalArgumentException("PIN ไม่ถูกต้อง");
        }

        Account account = Account.builder()
                .accountId(generateAccountId())
                .balance(0.00)
                .status("เปิดใช้งาน")
                .createdDate(Calendar.getInstance())
                .member(member)
                .build();

        return accountRepository.save(account);
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

    public Account updateAccount(String accountId, Account update) {
        return accountRepository.findById(accountId).map(existing -> {
            existing.setBalance(update.getBalance());
            existing.setStatus(update.getStatus());
            existing.setCreatedDate(update.getCreatedDate());
            existing.setMember(update.getMember());
            return accountRepository.save(existing);
        }).orElse(null);
    }

    public boolean deleteAccount(String accountId) {
        if (!accountRepository.existsById(accountId)) {
            return false;
        }
        accountRepository.deleteById(accountId);
        return true;
    }
}

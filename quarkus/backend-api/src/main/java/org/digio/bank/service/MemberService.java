package org.digio.bank.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import org.digio.bank.dto.Register;
import org.digio.bank.repository.MemberRepository;
import org.digio.entity.model.Member;
import org.digio.entity.model.Address;
import org.digio.checkthaiid.validate.ValidateID;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.function.Consumer;
import java.util.logging.Logger;

@ApplicationScoped
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordService passwordService;

    private static final String USERNAME = "username";
    private static final String EMAIL = "email";

    @Inject
    public MemberService(
            MemberRepository memberRepository,
            PasswordService passwordService
    ) {
        this.memberRepository = memberRepository;
        this.passwordService = passwordService;
    }

    public List<Member> getAllMembers() {
        return memberRepository.listAll();
    }

    public Member getMemberById(Long memberId) {
        return memberRepository.findById(memberId);
    }

    public Member getMemberByEmail(String email) {
        return memberRepository.find(EMAIL, email).firstResult();
    }

    public Member getMemberByUsername(String username) {
        return memberRepository.find(USERNAME, username).firstResult();
    }

    @Transactional
    public Member registerMember(Register req) {

        if (memberRepository.find(EMAIL, req.getEmail()).firstResult() != null) {
            throw new IllegalArgumentException("อีเมลนี้ถูกใช้งานแล้ว");
        }
        if (memberRepository.find(USERNAME, req.getUsername()).firstResult() != null) {
            throw new IllegalArgumentException("ชื่อผู้ใช้งานนี้ถูกใช้งานแล้ว");
        }

        if (!ValidateID.isValidThaiId(req.getMemberId())) {
            throw new IllegalArgumentException("รูปแบบเลขบัตรประชาชนไม่ถูกต้อง");
        }

        String hashedPassword = passwordService.encode(req.getPassword());
        String hashedPin = passwordService.encode(req.getPin());

        Address address = Address.builder()
                .houseNumber(req.getHouseNumber())
                .soi(req.getSoi())
                .road(req.getRoad())
                .subDistrict(req.getSubDistrict())
                .district(req.getDistrict())
                .province(req.getProvince())
                .postalCode(req.getPostalCode())
                .build();

        Instant birthDate;
        try {
            birthDate = LocalDate.parse(req.getBirthDate())
                    .atStartOfDay(ZoneOffset.UTC)
                    .toInstant();
        } catch (Exception e) {
            throw new IllegalArgumentException("รูปแบบวันที่ไม่ถูกต้อง ต้องเป็น yyyy-MM-dd");
        }

        Member member = Member.builder()
                .memberId(req.getMemberId())
                .username(req.getUsername())
                .password(hashedPassword)
                .pin(hashedPin)
                .prefixTh(req.getPrefixTh())
                .prefixEn(req.getPrefixEn())
                .firstNameTh(req.getFirstNameTh())
                .lastNameTh(req.getLastNameTh())
                .firstNameEn(req.getFirstNameEn())
                .lastNameEn(req.getLastNameEn())
                .email(req.getEmail())
                .phoneNumber(req.getPhoneNumber())
                .birthDate(birthDate)
                .address(address)
                .build();

        memberRepository.persist(member);

        Logger.getLogger(getClass().getName()).info("รหัส สมาชิก: " + member.getMemberId());

        return member;
    }

    @Transactional
    public Member updateMember(Long memberId, Member update) {

        Member existing = memberRepository.findById(memberId);
        if (existing == null) {
            return null;
        }

        updateIfPresent(existing::setUsername, update.getUsername());

        if (update.getPassword() != null && !update.getPassword().isBlank()) {
            existing.setPassword(passwordService.encode(update.getPassword()));
        }

        if (update.getPin() != null && !update.getPin().isBlank()) {
            existing.setPin(passwordService.encode(update.getPin()));
        }

        updateIfPresent(existing::setPrefixTh, update.getPrefixTh());
        updateIfPresent(existing::setPrefixEn, update.getPrefixEn());
        updateIfPresent(existing::setFirstNameTh, update.getFirstNameTh());
        updateIfPresent(existing::setLastNameTh, update.getLastNameTh());
        updateIfPresent(existing::setFirstNameEn, update.getFirstNameEn());
        updateIfPresent(existing::setLastNameEn, update.getLastNameEn());
        updateIfPresent(existing::setEmail, update.getEmail());

        if (update.getBirthDate() != null) {
            existing.setBirthDate(update.getBirthDate());
        }

        updateIfPresent(existing::setPhoneNumber, update.getPhoneNumber());

        return existing;
    }

    private void updateIfPresent(Consumer<String> setter, String value) {
        if (value != null && !value.isBlank()) {
            setter.accept(value);
        }
    }


    @Transactional
    public boolean deleteMember(Long memberId) {
        return memberRepository.deleteById(memberId);
    }

    private boolean isEmail(String s) {
        return s.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }

    public Member login(String user, String rawPassword) {
        if (user == null || user.isBlank()) {
            throw new IllegalArgumentException("กรุณากรอกอีเมลหรือชื่อผู้ใช้");
        }

        String key = user.trim();
        Member member;
        if (isEmail(key)) {
            member = memberRepository.find(EMAIL, key).firstResult();
        } else {
            member = memberRepository.find(USERNAME, key).firstResult();
        }

        if (member == null) {
            throw new IllegalArgumentException("ไม่พบผู้ใช้งาน");
        }

        if (!passwordService.matches(rawPassword, member.getPassword())) {
            throw new IllegalArgumentException("รหัสผ่านไม่ถูกต้อง");
        }

        return member;
    }

}

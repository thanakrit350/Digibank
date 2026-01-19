package org.digio.bank.service;

import lombok.RequiredArgsConstructor;
import org.digio.bank.dto.Register;
import org.digio.entitty.model.Member;
import org.digio.entitty.model.Address;
import org.digio.bank.repository.MemberRepository;
import org.digio.checkthaiid.validate.ValidateID;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.List;
import java.util.logging.Logger;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordService passwordService;

    public List<Member> getAllMembers() {

        return memberRepository.findAll();
    }

    public Member getMemberByEmail(String email) {

        return memberRepository.findByEmail(email);
    }

    public Member getMemberByUsername(String username) {

        return memberRepository.findByUsername(username);
    }

    public Member registerMember(Register req) {
        Member checkEmail = memberRepository.findByEmail(req.getEmail());
        Member checkMember = memberRepository.findByUsername(req.getUsername());
        if (checkEmail != null) {
            throw new IllegalArgumentException("อีเมลนี้ถูกใช้งานแล้ว");
        }
        if (checkMember != null) {
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

        Calendar birthdate = null;
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
            birthdate = Calendar.getInstance();
            birthdate.setTime(sdf.parse(req.getBirthDate()));
        } catch (Exception e) {
            throw  new IllegalArgumentException("รูปแบบวันที่ไม่ถูกต้อง ต้องเป็น yyyy-MM-dd");
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
                .birthDate(birthdate)
                .address(address)
                .build();

        Logger logger = Logger.getLogger(getClass().getName());

        logger.info("REQ HOUSE = " + req.getHouseNumber());
        logger.info("REQ DISTRICT = " + req.getDistrict());
        logger.info("REQ PROVINCE = " + req.getProvince());


        return memberRepository.save(member);
    }

    public Member updateMember(String memberId, Member update) {
        return memberRepository.findById(memberId).map(existing -> {
            existing.setUsername(update.getUsername());
            if (update.getPassword() != null && !update.getPassword().isBlank()) {
                existing.setPassword(passwordService.encode(update.getPassword()));
            }

            if (update.getPin() != null && !update.getPin().isBlank()) {
                existing.setPin(passwordService.encode(update.getPin()));
            }
            existing.setPrefixTh(update.getPrefixTh());
            existing.setPrefixEn(update.getPrefixEn());
            existing.setFirstNameTh(update.getFirstNameTh());
            existing.setLastNameTh(update.getLastNameTh());
            existing.setFirstNameEn(update.getFirstNameEn());
            existing.setLastNameEn(update.getLastNameEn());
            existing.setEmail(update.getEmail());
            existing.setBirthDate(update.getBirthDate());
            existing.setPhoneNumber(update.getPhoneNumber());

            return memberRepository.save(existing);
        }).orElse(null);
    }

    public Boolean deleteMember(String memberId) {
        if (!memberRepository.existsById(memberId)) {
            return false;
        }
        memberRepository.deleteById(memberId);
        return true;
    }

    public Member getMemberById(String memberId) {

        return memberRepository.findById(memberId).orElse(null);
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
            member = memberRepository.findByEmail(key);
        } else {
            member = memberRepository.findByUsername(key);
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

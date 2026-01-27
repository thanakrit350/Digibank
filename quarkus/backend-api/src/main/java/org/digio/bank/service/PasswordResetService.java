package org.digio.bank.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.digio.bank.dto.ResetPassword;
import org.digio.entity.model.Member;


@ApplicationScoped
public class PasswordResetService {

    private final MemberService memberService;
    private final PasswordService passwordService;

    @Inject
    public PasswordResetService(MemberService memberService, PasswordService passwordService) {
        this.memberService = memberService;
        this.passwordService = passwordService;
    }

    @Transactional
    public void resetPasswordByEmail(ResetPassword req) {
        Member member = memberService.getMemberByEmail(req.getEmail());
        if (member == null) {
            return;
        }
        if (!passwordService.matches(req.getPin(), member.getPin())) {
            throw new IllegalArgumentException("PIN ไม่ถูกต้อง");
        }

        member.setPassword(passwordService.encode(req.getNewPassword()));
    }

}

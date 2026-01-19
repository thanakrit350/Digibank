package org.digio.bank.controller;

import lombok.RequiredArgsConstructor;
import org.digio.bank.dto.Login;
import org.digio.bank.dto.Register;
import org.digio.entitty.model.Member;
import org.digio.bank.service.MemberService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @GetMapping
    public ResponseEntity<List<Member>> getAllMembers() {
        return ResponseEntity.ok(memberService.getAllMembers());
    }

    @GetMapping("/{memberId}")
    public ResponseEntity<Member> getMemberById(@PathVariable String memberId) {
        Member member = memberService.getMemberById(memberId);
        return member != null ? ResponseEntity.ok(member) : ResponseEntity.notFound().build();
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<Member> getMemberByEmail(@PathVariable String email) {
        Member member = memberService.getMemberByEmail(email);
        return member != null ? ResponseEntity.ok(member) : ResponseEntity.notFound().build();
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<Member> getMemberByUsername(@PathVariable String username) {
        Member member = memberService.getMemberByUsername(username);
        return member != null ? ResponseEntity.ok(member) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Member> addMember(@RequestBody Register request) {
        Member addMember = memberService.registerMember(request);
        return ResponseEntity.ok(addMember);
    }

    @PostMapping("/login")
    public ResponseEntity<Member> login(@RequestBody Login loginMember) {
        Member login = memberService.login(loginMember.getUser(), loginMember.getPassword());
        return ResponseEntity.ok(login);
    }

    @PutMapping("/{memberId}")
    public ResponseEntity<Member> updateMember(@PathVariable String memberId, @RequestBody Member member) {
        Member updateM = memberService.updateMember(memberId, member);
        return updateM != null ? ResponseEntity.ok(updateM) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{memberId}")
    public ResponseEntity<Void> removeMember(@PathVariable String memberId) {
        boolean deleteMember = memberService.deleteMember(memberId);
        return deleteMember ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }


}



package org.digio.bank.repository;


import org.digio.entitty.model.Member;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, String > {
    Member findByEmail(String email);
    Member findByUsername(String username);

}

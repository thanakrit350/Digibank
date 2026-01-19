package org.digio.bank.repository;

import org.digio.entitty.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccountRepository extends JpaRepository<Account, String> {
    List<Account> findByMember_MemberId(String memberId);
}

package org.digio.bank.repository;

import org.digio.entitty.model.Admin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminRepository  extends JpaRepository<Admin, Integer> {
    List<Admin> findByUsername (String username);
}

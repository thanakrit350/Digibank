package org.digio.bank.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import org.digio.entity.model.Admin;

@ApplicationScoped
public class AdminRepository implements PanacheRepository<Admin> {
}

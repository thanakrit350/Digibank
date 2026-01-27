package org.digio.bank.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import org.digio.entity.model.Account;

@ApplicationScoped
public class AccountRepository implements PanacheRepository<Account> {
}

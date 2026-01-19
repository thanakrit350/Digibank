package org.digio.bank;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(
		scanBasePackages = {
				"org.digio.bank",
				"org.digio.entitty"
		}
)
@EntityScan(basePackages = {
		"org.digio.entitty.model"
})
@EnableJpaRepositories(basePackages = {
		"org.digio.bank.repository"
})
@EnableScheduling
public class BankThanakritApplication {

	public static void main(String[] args) {
		SpringApplication.run(BankThanakritApplication.class, args);
	}

}

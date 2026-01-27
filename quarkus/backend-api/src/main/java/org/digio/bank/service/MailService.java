package org.digio.bank.service;

import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;


@ApplicationScoped
public class MailService {

    private final Mailer mailer;

    @Inject
    public MailService(Mailer mailer) {
        this.mailer = mailer;
    }

    public void sendTransactionPdf(String email, byte[] pdf, String txId) {
        try {
            mailer.send(
                    Mail.withText(
                            email,
                            "Transaction Detail: " + txId,
                            "เอกสารแนบเป็นรายละเอียดรายการธุรกรรม\nรหัสผ่าน PDF คือเลขบัญชี 4 ตัวท้าย"
                    ).addAttachment(
                            "transaction-" + txId + ".pdf",
                            pdf,
                            "application/pdf"
                    )
            );
        } catch (Exception e) {
            throw new IllegalArgumentException("ส่งอีเมลไม่สำเร็จ");
        }
    }
}

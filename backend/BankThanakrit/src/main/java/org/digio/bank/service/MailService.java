package org.digio.bank.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    public void sendTransactionPdf(String email, byte[] pdf, String txId) {

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(email);
            helper.setSubject("Transaction Detail: " + txId);
            helper.setText("เอกสารแนบเป็นรายละเอียดรายการธุรกรรม\nรหัสผ่าน PDF คือเลขบัญชี 4 ตัวท้าย");

            helper.addAttachment("transaction-" + txId + ".pdf", new ByteArrayResource(pdf));

            mailSender.send(message);

        } catch (Exception e) {
            throw new IllegalArgumentException  ("ส่งอีเมลไม่สำเร็จ");
        }
    }
}


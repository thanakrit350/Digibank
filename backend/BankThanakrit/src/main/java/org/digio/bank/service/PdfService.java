package org.digio.bank.service;

import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.EncryptionConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.WriterProperties;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.element.Table;
import lombok.extern.slf4j.Slf4j;
import org.digio.bank.dto.TransactionView;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

@Slf4j
@Service
public class PdfService {

    public byte[] generateTransactionPdf(TransactionView v, String password) throws IOException {

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        WriterProperties props = new WriterProperties()
                .setStandardEncryption(
                        password.getBytes(),
                        null,
                        EncryptionConstants.ALLOW_PRINTING,
                        EncryptionConstants.ENCRYPTION_AES_128
                );

        PdfWriter writer = new PdfWriter(out, props);
        PdfDocument pdf = new PdfDocument(writer);

        PdfFont regular = PdfFontFactory.createFont(
                "fonts/Sarabun-Regular.ttf",
                PdfEncodings.IDENTITY_H,
                PdfFontFactory.EmbeddingStrategy.PREFER_EMBEDDED
        );

        PdfFont bold = PdfFontFactory.createFont(
                "fonts/Sarabun-Bold.ttf",
                PdfEncodings.IDENTITY_H,
                PdfFontFactory.EmbeddingStrategy.PREFER_EMBEDDED
        );

        Document doc = new Document(pdf);
        doc.setMargins(20, 20, 20, 20);
        doc.setFont(regular);
        Table slip = new Table(1);
        slip.setWidth(UnitValue.createPercentValue(100));
        slip.setBorder(new SolidBorder(1));

        slip.addCell(centerCell("DIGIO BANK", bold, 18, Border.NO_BORDER));
        slip.addCell(centerCell("Transaction Success", bold, 14, Border.NO_BORDER));

        slip.addCell(line());

        slip.addCell(centerCell(
                formatCurrency(Math.abs(v.getAmount())),
                bold,
                24,
                Border.NO_BORDER
        ));

        slip.addCell(line());

        Table detail = new Table(new float[]{3, 5});
        detail.setWidth(UnitValue.createPercentValue(100));

        detail.addCell(label("Transaction ID"));
        detail.addCell(value(v.getTransientId()));

        detail.addCell(label("Date"));
        detail.addCell(value(formatDate(v.getTransactionDate())));

        detail.addCell(label("Type"));
        detail.addCell(value(v.getType()));

        detail.addCell(label("From"));
        detail.addCell(value(nvl(v.getFromAccount())));

        detail.addCell(label("To"));
        detail.addCell(value(nvl(v.getToAccount())));

        detail.addCell(label("Status"));
        detail.addCell(value(v.getStatus()));

        slip.addCell(new Cell().add(detail).setBorder(Border.NO_BORDER));

        doc.add(slip);
        doc.close();

        return out.toByteArray();
    }

    private Cell centerCell(String text, PdfFont font, int size, Border border) {
        return new Cell()
                .add(new Paragraph(text).setFont(font).setFontSize(size))
                .setTextAlignment(TextAlignment.CENTER)
                .setBorder(border)
                .setPadding(8);
    }

    private Cell label(String text) {
        return new Cell()
                .add(new Paragraph(text))
                .setFontSize(12)
                .setBorder(Border.NO_BORDER);
    }

    private Cell value(String text) {
        return new Cell()
                .add(new Paragraph(text))
                .setFontSize(12)
                .setTextAlignment(TextAlignment.RIGHT)
                .setBorder(Border.NO_BORDER);
    }

    private Cell line() {
        return new Cell()
                .setBorderBottom(new SolidBorder(0.8f))
                .setBorderLeft(Border.NO_BORDER)
                .setBorderRight(Border.NO_BORDER)
                .setBorderTop(Border.NO_BORDER)
                .setHeight(8);
    }

    private String nvl(String v) {

        return v == null || v.isBlank() ? "-" : v;
    }

    private String formatDate(Calendar date) {
        if (date == null) return "ไม่ระบุวันที่";

        Locale thaiLocale = Locale.forLanguageTag("th-TH");
        SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm", thaiLocale);
        sdf.setCalendar(date);
        return sdf.format(date.getTime());
    }

    private String formatCurrency(double amount) {
        return String.format("฿%.2f", Math.abs(amount));
    }

}


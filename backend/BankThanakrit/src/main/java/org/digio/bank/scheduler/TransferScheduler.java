package org.digio.bank.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.digio.bank.service.TransactionService;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TransferScheduler {

    private final TransactionService transactionService;
    //มิลลิวินาที
//    @Scheduled(fixedRate = 5000)
//    public void runAutoTransferJob() {
//        log.info("เริ่มทำการโอนเงิน 5 วิ");
//        transactionService.autoTransferEx();
//    transactionService.exportTransactionPdf("38118240WNA93246");
//    }
}

package org.digio.bank.controller;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.digio.bank.dto.Deposit;
import org.digio.bank.dto.TransactionView;
import org.digio.bank.dto.Transfer;
import org.digio.bank.dto.Withdraw;
import org.digio.bank.service.TransactionService;
import org.digio.entity.model.Transaction;

import java.util.List;

@Path("/transactions")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class TransactionController {

    private final TransactionService transactionService;

    @Inject
    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GET
    public List<TransactionView> getAllTransactions() {

        return transactionService.getAllTransactions();
    }

    @GET
    @Path("{transactionId}")
    public Response getTransactionById(@PathParam("transactionId") String transactionId) {
        Transaction transaction = transactionService.getTransactionById(transactionId);
        return transaction != null
                ? Response.ok(transaction).build()
                : Response.status(Response.Status.NOT_FOUND).build();
    }

    @GET
    @Path("/account/{accountId}")
    public Response getByAccount(@PathParam("accountId") String accountId) {
        List<Transaction> transactions = transactionService.getByAccountId(accountId);
        return Response.ok(transactions).build();
    }

    @POST
    public Response addTransaction(Transaction request) {
        Transaction created = transactionService.createTransaction(request);
        return Response.status(Response.Status.CREATED)
                .entity(created)
                .build();
    }

    @POST
    @Path("/deposit")
    public Response deposit(Deposit request) {
        Transaction deposit = transactionService.deposit(request);
        return Response.status(Response.Status.CREATED)
                .entity(deposit)
                .build();
    }

    @POST
    @Path("/withdraw")
    public Response withdraw(Withdraw request) {
        Transaction withdraw = transactionService.withdraw(request);
        return Response.status(Response.Status.CREATED)
                .entity(withdraw)
                .build();
    }

    @POST
    @Path("/transfer")
    public Response transfer(Transfer request) {
        Transaction transfer = transactionService.transfer(request);
        return Response.status(Response.Status.CREATED)
                .entity(transfer)
                .build();
    }

    @POST
    @Path("/{transactionId}/pdf")
    public Response exportTransactionPdf(@PathParam("transactionId") String transactionId) {
        transactionService.exportTransactionPdf(transactionId);
        return Response.ok(java.util.Map.of("message", "ส่ง PDF ไปที่อีเมลเรียบร้อย")).build();
    }

    @PUT
    @Path("/{transactionId}")
    public Response updateTransaction(@PathParam("transactionId") String transactionId, Transaction request) {
        Transaction updated = transactionService.updateTransaction(transactionId, request);
        return updated != null
                ? Response.ok(updated).build()
                : Response.status(Response.Status.NOT_FOUND).build();

    }

    @DELETE
    @Path("/{transactionId}")
    @Consumes(MediaType.WILDCARD)
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteTransaction(@PathParam("transactionId") String transactionId) {
        boolean deleted = transactionService.deleteTransaction(transactionId);
        return deleted
                ? Response.noContent().build()
                : Response.status(Response.Status.NOT_FOUND).build();
    }
}



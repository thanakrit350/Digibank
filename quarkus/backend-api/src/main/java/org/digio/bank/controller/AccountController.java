package org.digio.bank.controller;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import org.digio.bank.dto.OpenAccount;
import org.digio.bank.service.AccountService;
import org.digio.entity.model.Account;

import java.util.List;

@Path("/accounts")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AccountController {

    private final AccountService accountService;

    @Inject
    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GET
    public List<Account> getAllAccounts() {
        return accountService.getAllAccounts();
    }

    @GET
    @Path("/{accountId}")
    public Response getAccountById(@PathParam("accountId") Long accountId) {
        Account account = accountService.getAccountById(accountId);
        return account != null ? Response.ok(account).build() : Response.status(Response.Status.NOT_FOUND).build();
    }

    @GET
    @Path("/member/{memberId}")
    public List<Account> getAccountsByMember(@PathParam("memberId") Long memberId) {
        return accountService.getAccountsByMember(memberId);
    }

    @POST
    public Response addAccount(@HeaderParam("x-member-id") Long loginMemberId, OpenAccount request) {
        if (loginMemberId == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        if (request.getMemberId() == null) {
            throw new IllegalArgumentException("กรุณากรอกเลขบัตรประชาชน");
        }

        if (!loginMemberId.equals(request.getMemberId())) {
            throw new IllegalArgumentException("เลขบัตรประชาชนไม่ตรงกับผู้ใช้งานที่ล็อกอิน");
        }

        Account created = accountService.createAccount(request);
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @PUT
    @Path("/{accountId}")
    public Response updateAccount(@PathParam("accountId") Long accountId, Account update) {
        Account updated = accountService.updateAccount(accountId, update);
        return updated != null ? Response.ok(updated).build() : Response.status(Response.Status.NOT_FOUND).build();
    }

    @DELETE
    @Path("/{accountId}")
    public Response deleteAccount(@PathParam("accountId") String accountId) {
        boolean deleted = accountService.deleteAccount(accountId);
        return deleted ? Response.noContent().build() : Response.status(Response.Status.NOT_FOUND).build();
    }
}

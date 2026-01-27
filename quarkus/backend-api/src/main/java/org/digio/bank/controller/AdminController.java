package org.digio.bank.controller;

import jakarta.json.JsonObject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.digio.bank.dto.AdminLogin;
import org.digio.bank.service.AdminService;
import org.digio.entity.model.Account;
import org.digio.entity.model.Transaction;

@Path("/admins")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AdminController {

    private final AdminService adminService;


    public AdminController(AdminService adminService ) {
        this.adminService = adminService;
    }

    @POST
    @Path("/login")
    public Response login(AdminLogin request) {
        try {
            return Response.ok(adminService.adminLogin(request)).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.UNAUTHORIZED).entity(e.getMessage()).build();
        }
    }

    @POST
    @Path("/accounts/{accountId}/status")
    public Response updateAccountStatus(@PathParam("accountId") String accountId, JsonObject body) {
        String status = body.getString("status");
        Account updated = adminService.updateAccountStatus(accountId, status);
        return Response.ok(updated).build();
    }

    @POST
    @Path("/transactions/{transactionId}/cancel")
    @Consumes(MediaType.WILDCARD)
    public Response cancelTransaction(@PathParam("transactionId") String transactionId) {
        Transaction canceled = adminService.cancelTransaction(transactionId);
        return Response.ok(canceled).build();
    }

}

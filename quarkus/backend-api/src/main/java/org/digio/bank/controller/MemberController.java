package org.digio.bank.controller;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import org.digio.bank.dto.Login;
import org.digio.bank.dto.Register;
import org.digio.bank.service.MemberService;
import org.digio.entity.model.Member;

import java.util.List;

@Path("/members")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class MemberController {

    private final MemberService memberService;

    @Inject
    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GET
    public List<Member> getAllMembers() {
        return memberService.getAllMembers();
    }

    @GET
    @Path("/{memberId}")
    public Response getMemberById(@PathParam("memberId") Long memberId) {
        Member member = memberService.getMemberById(memberId);
        return member != null
                ? Response.ok(member).build()
                : Response.status(Response.Status.NOT_FOUND).build();
    }

    @GET
    @Path("/email/{email}")
    public Response getMemberByEmail(@PathParam("email") String email) {
        Member member = memberService.getMemberByEmail(email);
        return member != null
                ? Response.ok(member).build()
                : Response.status(Response.Status.NOT_FOUND).build();
    }

    @GET
    @Path("/username/{username}")
    public Response getMemberByUsername(@PathParam("username") String username) {
        Member member = memberService.getMemberByUsername(username);
        return member != null
                ? Response.ok(member).build()
                : Response.status(Response.Status.NOT_FOUND).build();
    }

    @POST
    public Response addMember(Register request) {
        Member created = memberService.registerMember(request);
        return Response.status(Response.Status.CREATED)
                .entity(created)
                .build();
    }

    @POST
    @Path("/login")
    public Response login(Login login) {
        Member member = memberService.login( login.getUser(), login.getPassword());
        return member != null
                ? Response.ok(member).build()
                : Response.status(Response.Status.UNAUTHORIZED).build();
    }

    @PUT
    @Path("/{memberId}")
    public Response updateMember(@PathParam("memberId") Long memberId, Member update) {
        Member updated = memberService.updateMember(memberId, update);
        return updated != null
                ? Response.ok(updated).build()
                : Response.status(Response.Status.NOT_FOUND).build();
    }

    @DELETE
    @Path("/{memberId}")
    public Response removeMember(@PathParam("memberId") Long memberId) {
        boolean deleted = memberService.deleteMember(memberId);
        return deleted
                ? Response.noContent().build()
                : Response.status(Response.Status.NOT_FOUND).build();
    }
}

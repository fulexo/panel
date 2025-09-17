// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type(email);
    cy.get('[data-cy=password-input]').type(password);
    cy.get('[data-cy=login-button]').click();
    cy.url().should('not.include', '/login');
  });
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-cy=logout-button]').click();
  cy.url().should('include', '/login');
});

Cypress.Commands.add('createUser', (userData: any) => {
  cy.request({
    method: 'POST',
    url: '/api/users',
    body: userData,
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

Cypress.Commands.add('deleteUser', (userId: string) => {
  cy.request({
    method: 'DELETE',
    url: `/api/users/${userId}`,
  }).then((response) => {
    expect(response.status).to.eq(200);
  });
});
describe('Drivers CRUD E2E Tests', () => {
  function randomPhone() {
    return '+1' + Math.floor(1000000000 + Math.random() * 9000000000);
  }
  let createdDriverId: number | null = null;

  it('should create a new driver', () => {
    cy.visit('/drivers');
    cy.contains('Add Driver').click();
    cy.get('#name').type('Alice New');
    const phone = randomPhone();
    cy.get('#phone').type(phone);
    cy.get('button[type="submit"]').contains(/create/i).click();
    cy.url().should('include', '/drivers');
    cy.contains('Alice New').should('be.visible');
    cy.contains(phone).should('be.visible');
    // Save the created driver's id for later tests
    cy.get('tr').contains('Alice New').parent('tr').within(() => {
      cy.get('button').contains('Edit').invoke('attr', 'onclick').then((onclick) => {
        if (onclick) {
          const match = onclick.match(/\/(\d+)\/edit/);
          if (match) createdDriverId = parseInt(match[1], 10);
        }
      });
    });
  });

  it('should edit a driver', () => {
    cy.visit('/drivers');
    cy.contains('Alice New').parent('tr').within(() => {
      cy.get('button').contains('Edit').click();
    });
    cy.get('#name').clear().type('Alice Updated');
    cy.get('button[type="submit"]').contains(/update/i).click();
    cy.url().should('include', '/drivers');
    cy.contains('Alice Updated').should('be.visible');
  });

  it('should list drivers', () => {
    cy.visit('/drivers');
    cy.contains('Drivers');
    cy.get('table').should('exist');
    cy.get('tbody tr').should('have.length.at.least', 1);
  });

  it('should delete a driver', () => {
    cy.visit('/drivers');
    cy.contains('Alice Updated').parent('tr').within(() => {
      cy.get('button').contains('Delete').click();
    });
    cy.contains('Alice Updated').should('not.exist');
  });
}); 
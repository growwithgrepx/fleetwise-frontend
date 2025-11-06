describe('Jobs CRUD E2E Tests', () => {
  // Mock data for testing
  const mockJobs = [
    {
      id: 1,
      customer_name: 'Alice Example',
      customer_email: 'alice@example.com',
      customer_mobile: '+1234567890',
      customer_reference: 'REF001',
      passenger_name: 'Alice Example',
      passenger_email: 'alice@example.com',
      passenger_mobile: '+1234567890',
      type_of_service: 'Point to Point',
      service_id: 1,
      pickup_date: '2024-06-01',
      pickup_time: '10:00',
      pickup_location: 'Central Station',
      dropoff_location: 'City Hall',
      vehicle_type: 'Sedan',
      vehicle_number: 'ABC123',
      driver_contact: '+0987654321',
      driver_id: 1,
      agent_id: 1,
      payment_mode: 'cash',
      payment_status: 'Unpaid',
      order_status: 'Confirmed',
      status: 'Pending',
      reference: 'JOB001',
      date: '2024-06-01',
      message: 'Test message',
      remarks: 'Test remarks',
      has_additional_stop: false,
      has_request: false,
      base_price: 100.00,
      base_discount_percent: 0,
      agent_discount_percent: 0,
      additional_discount_percent: 0,
      additional_charges: 0,
      final_price: 100.00,
      invoice_number: 'INV001'
    },
    {
      id: 2,
      customer_name: 'Bob Test',
      customer_email: 'bob@test.com',
      customer_mobile: '+1234567891',
      customer_reference: 'REF002',
      passenger_name: 'Bob Test',
      passenger_email: 'bob@test.com',
      passenger_mobile: '+1234567891',
      type_of_service: 'Airport Transfer',
      service_id: 2,
      pickup_date: '2024-06-02',
      pickup_time: '14:00',
      pickup_location: 'Airport',
      dropoff_location: 'Harbor',
      vehicle_type: 'SUV',
      vehicle_number: 'XYZ789',
      driver_contact: '+0987654322',
      driver_id: 2,
      agent_id: 2,
      payment_mode: 'Credit Card',
      payment_status: 'Paid',
      order_status: 'Completed',
      status: 'Completed',
      reference: 'JOB002',
      date: '2024-06-02',
      message: 'Completed job',
      remarks: 'Successfully completed',
      has_additional_stop: false,
      has_request: false,
      base_price: 150.00,
      base_discount_percent: 10,
      agent_discount_percent: 5,
      additional_discount_percent: 0,
      additional_charges: 20,
      final_price: 147.50,
      invoice_number: 'INV002'
    }
  ];

  const newJob = {
    id: 3,
    customer_name: 'Charlie New',
    customer_email: 'charlie@new.com',
    customer_mobile: '+1234567892',
    customer_reference: 'REF003',
    passenger_name: 'Charlie New',
    passenger_email: 'charlie@new.com',
    passenger_mobile: '+1234567892',
    type_of_service: 'Point to Point',
    service_id: 3,
    pickup_date: '2024-06-03',
    pickup_time: '09:00',
    pickup_location: 'Downtown',
    dropoff_location: 'Suburb',
    vehicle_type: 'Van',
    vehicle_number: 'DEF456',
    driver_contact: '+0987654323',
    driver_id: 3,
    agent_id: 3,
    payment_mode: 'Bank Transfer',
    payment_status: 'Pending',
    order_status: 'Scheduled',
    status: 'New',
    reference: 'JOB003',
    date: '2024-06-03',
    message: 'New job created',
    remarks: 'Fresh booking',
    has_additional_stop: false,
    has_request: false,
    base_price: 80.00,
    base_discount_percent: 0,
    agent_discount_percent: 0,
    additional_discount_percent: 0,
    additional_charges: 0,
    final_price: 80.00,
    invoice_number: 'INV003'
  };

  const updatedJob = {
    ...newJob,
    customer_name: 'Charlie Updated',
    final_price: 85.00
  };

  beforeEach(() => {
    // Intercept API calls for jobs list
    cy.intercept('GET', '/api/jobs/table*', {
      statusCode: 200,
      body: {
        items: mockJobs,
        total: mockJobs.length,
        page: 1,
        per_page: 10,
        pages: 1,
      },
    }).as('getJobs');

    // Intercept GET job by ID
    cy.intercept('GET', '**/jobs/view/*', {
      statusCode: 200,
      body: newJob,
    }).as('getJobById');

    // Intercept POST create job
    cy.intercept('POST', '/jobs/add', {
      statusCode: 201,
      body: newJob,
    }).as('createJob');

    // Intercept POST update job
    cy.intercept('POST', '/jobs/edit/*', {
      statusCode: 200,
      body: updatedJob,
    }).as('updateJob');

    // Intercept POST delete job
    cy.intercept('POST', '/jobs/delete/*', {
      statusCode: 200,
      body: { message: 'Job deleted successfully' },
    }).as('deleteJob');
  });

  describe('READ - Jobs List', () => {
    it('should display the initial list of jobs correctly', () => {
      // Visit the jobs page
      cy.visit('/jobs');

      // Wait for the API call
      cy.wait('@getJobs');

      // Assert that the mock data is rendered in the table
      cy.contains('Alice Example').should('be.visible');
      cy.contains('Central Station').should('be.visible');
      cy.contains('City Hall').should('be.visible');
      cy.contains('Pending').should('be.visible'); // job status
      cy.contains('100.00').should('be.visible');

      cy.contains('Bob Test').should('be.visible');
      cy.contains('Airport').should('be.visible');
      cy.contains('Harbor').should('be.visible');
      cy.contains('Completed').should('be.visible'); // job status
      cy.contains('147.50').should('be.visible');

      // Expand Bob Test row to check payment status
      cy.contains('Bob Test').closest('tr').within(() => {
        cy.get('button').first().click();
      });
      cy.contains('Paid').should('be.visible'); // payment status in expanded details

      // Verify table structure
      cy.get('table').should('be.visible');
      cy.get('thead').should('contain', 'Customer Name');
      cy.get('thead').should('contain', 'Type of Service');
      cy.get('thead').should('contain', 'Date');
      cy.get('thead').should('contain', 'Pickup');
      cy.get('thead').should('contain', 'Drop-off');
      cy.get('thead').should('contain', 'Final Price');
      cy.get('thead').should('contain', 'Job Status');
      cy.get('thead').should('contain', 'Actions');

      // Verify Create Job button is present
      cy.contains('Create Job').should('be.visible');
    });
  });

  describe.only('CREATE - New Job', () => {
    it('should create a new job successfully', () => {
      // Visit the jobs page first
      cy.visit('/jobs');
      cy.wait('@getJobs');

      // Click Create Job button
      cy.contains('Create Job').click();

      // Verify we're on the new job page
      cy.url().should('include', '/jobs/new');
      cy.contains('Create New Job').should('be.visible');

      // Fill in the form
      cy.get('#customer_name').type('Charlie New');
      cy.get('#customer_email').type('charlie@new.com');
      cy.get('#customer_mobile').type('+1234567892');
      cy.get('#customer_reference').type('REF003');
      cy.get('#passenger_name').type('Charlie New');
      cy.get('#passenger_email').type('charlie@new.com');
      cy.get('#passenger_mobile').type('+1234567892');
      cy.get('#type_of_service').select('Point to Point');
      // Use a future date for pickup_date
      const today = new Date();
      const futureDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
      const futureDate = futureDateObj.toISOString().slice(0, 10);
      cy.get('#pickup_date').type(futureDate);
      cy.get('#pickup_time').type('09:00');
      cy.get('#pickup_location').type('Downtown');
      cy.get('#dropoff_location').type('Suburb');
      cy.get('#vehicle_type').type('Van');
      cy.get('#vehicle_number').type('DEF456');
      cy.get('#driver_contact').type('+0987654323');
      cy.get('#base_price').type('80');
      cy.get('#remarks').type('Fresh booking');
      cy.get('#message').type('New job created');

      // Submit the form
      cy.contains('Create Job').click();

      // Wait for the create API call
      cy.wait('@createJob');

      // Verify redirect to jobs list
      cy.url().should('include', '/jobs');
      // Do not expect the new job to appear in the list (static mock data)
    });
  });

  describe('UPDATE - Edit Job', () => {
    it('should edit an existing job successfully', () => {
      // Visit the jobs page
      cy.visit('/jobs');
      cy.wait('@getJobs');

      // Find and click Edit button for the first job (Alice Example)
      cy.contains('Alice Example')
        .closest('tr')
        .within(() => {
          cy.contains('Edit').click();
        });

      // Verify we're on the edit page
      cy.url().should('include', '/jobs/1/edit');
      cy.contains('Edit Job').should('be.visible');

      // Wait for the job data to load
      cy.wait('@getJobById');

      // Change the customer name
      cy.get('#customer_name').clear().type('Charlie Updated');
      cy.get('#base_price').clear().type('85');

      // Submit the form
      cy.contains('Update Job').click();

      // Wait for the update API call
      cy.wait('@updateJob');

      // Verify redirect to jobs list
      cy.url().should('include', '/jobs');
      // Do not expect the updated job to appear in the list (static mock data)
    });
  });

  describe('DELETE - Remove Job', () => {
    it('should delete a job successfully', () => {
      // Visit the jobs page
      cy.visit('/jobs');
      cy.wait('@getJobs');

      // Find and click Delete button for the first job
      cy.contains('Alice Example')
        .closest('tr')
        .within(() => {
          cy.contains('Delete').click();
        });

      // Confirm the deletion in the browser's confirm dialog
      cy.on('window:confirm', () => true);

      // Wait for the delete API call
      cy.wait('@deleteJob');

      // Verify redirect to jobs list
      cy.url().should('include', '/jobs');
      // Do not expect the job to be removed from the list (static mock data)
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      // Intercept with error response
      cy.intercept('GET', '/api/jobs/table*', {
        statusCode: 500,
        body: { error: 'Internal server error' },
      }).as('getJobsError');

      // Visit the jobs page
      cy.visit('/jobs');

      // Wait for the error API call
      cy.wait('@getJobsError');

      // Verify error message is displayed
      cy.contains('Error loading jobs').should('be.visible');
    });

    it('should handle form validation errors', () => {
      // Visit the new job page
      cy.visit('/jobs/new');

      // Try to submit without required fields
      cy.contains('Create Job').click();

      // Verify validation errors are displayed
      cy.contains('Customer name is required').should('be.visible');
      cy.contains('Type of service is required').should('be.visible');
      cy.contains('Pickup date is required').should('be.visible');
      cy.contains('Pickup time is required').should('be.visible');
      cy.contains('Pickup location is required').should('be.visible');
      cy.contains('Dropoff location is required').should('be.visible');
    });
  });

  describe('Navigation and UI', () => {
    it('should handle cancel actions correctly', () => {
      // Visit the new job page
      cy.visit('/jobs/new');

      // Fill some data
      cy.get('#customer_name').type('Test Customer');

      // Click Cancel - use force to handle any overlay issues
      cy.contains('Cancel').click({ force: true });

      // Wait for navigation and verify redirect to jobs list
      cy.url().should('include', '/jobs');
    });

    it('should expand job details when clicking on a row', () => {
      // Visit the jobs page
      cy.visit('/jobs');
      cy.wait('@getJobs');

      // Click on the expand button for the first job
      cy.contains('Alice Example')
        .closest('tr')
        .within(() => {
          cy.get('button').first().click();
        });

      // Verify expanded details are shown
      cy.contains('Customer Info').should('be.visible');
      cy.contains('Passenger Info').should('be.visible');
      cy.contains('Trip Details').should('be.visible');
      cy.contains('Pricing & Status').should('be.visible');
    });

    it('should filter jobs correctly', () => {
      // Visit the jobs page
      cy.visit('/jobs');
      cy.wait('@getJobs');

      // Use the search filter
      cy.get('input[placeholder*="Quick search"]').type('Alice');

      // Verify only Alice's job is visible
      cy.contains('Alice Example').should('be.visible');
      cy.contains('Bob Test').should('not.exist');
    });
  });
}); 
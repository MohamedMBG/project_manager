(() => {
  // We implement a simple page switcher instead of using React Router to
  // maximise compatibility when running from the file system. No imports
  // from ReactRouterDOM are necessary.
  const { useState, useEffect, useRef } = React;

  /**
   * Root application component. It manages global project state and defines
   * routes for dashboard and clients pages. It also provides handlers for
   * creating, deleting and toggling the completion status of projects.
   */
  function App() {
    const [projects, setProjects] = useState([]);

    // Keep track of the current page. 'dashboard' or 'clients'
    const [currentPage, setCurrentPage] = useState('dashboard');

    // Fetch projects from the backend on mount
    useEffect(() => {
      fetch('/api/projects')
        .then((res) => res.json())
        .then((data) => setProjects(data))
        .catch((err) => console.error(err));
    }, []);

    /**
     * Add a new project via POST request and append it to state.
     * @param {Object} project
     */
    const addProject = (project) => {
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      })
        .then((res) => res.json())
        .then((newProject) => {
          setProjects((prev) => [...prev, newProject]);
        })
        .catch((err) => console.error(err));
    };

    /**
     * Delete a project via DELETE request and remove it from state.
     * @param {number} id
     */
    const deleteProject = (id) => {
      fetch(`/api/projects/${id}`, { method: 'DELETE' })
        .then((res) => res.json())
        .then(() => {
          setProjects((prev) => prev.filter((p) => p.id !== id));
        })
        .catch((err) => console.error(err));
    };

    /**
     * Toggle the finished status of a project. Sends a PUT request with
     * updated fields and updates state with the returned project.
     * @param {Object} project
     */
    const toggleFinished = (project) => {
      const updated = { ...project, finished: project.finished ? 0 : 1 };
      fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
        .then((res) => res.json())
        .then((updatedRow) => {
          setProjects((prev) =>
            prev.map((p) => (p.id === updatedRow.id ? updatedRow : p))
          );
        })
        .catch((err) => console.error(err));
    };

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(NavBar, {
        currentPage: currentPage,
        onNavigate: setCurrentPage,
      }),
      currentPage === 'dashboard'
        ? React.createElement(Dashboard, {
            projects: projects,
            onAdd: addProject,
            onToggleFinish: toggleFinished,
            onDelete: deleteProject,
          })
        : React.createElement(ClientsPage, { projects: projects })
    );
  }

  /**
   * Navigation bar component containing links to dashboard and clients pages.
   */
  function NavBar({ currentPage, onNavigate }) {
    const linkStyle = (page) =>
      page === currentPage ? 'nav-active' : '';
    return React.createElement(
      'nav',
      { className: 'navbar' },
      React.createElement('div', { className: 'logo' }, 'Project Manager'),
      React.createElement(
        'div',
        { className: 'nav-links' },
        React.createElement(
          'a',
          {
            href: '#dashboard',
            className: linkStyle('dashboard'),
            onClick: (e) => {
              e.preventDefault();
              onNavigate('dashboard');
            },
          },
          'Dashboard'
        ),
        React.createElement(
          'a',
          {
            href: '#clients',
            className: linkStyle('clients'),
            onClick: (e) => {
              e.preventDefault();
              onNavigate('clients');
            },
          },
          'Clients'
        )
      )
    );
  }

  /**
   * Dashboard page that displays the project management tools: a calendar,
   * aggregated charts and a table. It also exposes a button that opens a
   * modal to add a new project.
   */
  function Dashboard({ projects, onAdd, onToggleFinish, onDelete }) {
    const [showModal, setShowModal] = useState(false);
    return React.createElement(
      'div',
      { className: 'container' },
      React.createElement(
        'div',
        { className: 'card' },
        React.createElement(
          'button',
          {
            onClick: () => setShowModal(true),
            className: 'btn-add',
            style: {
              marginBottom: '1rem',
            },
          },
          'Add Project'
        ),
        showModal
          ? React.createElement(
              Modal,
              {
                onClose: () => setShowModal(false),
              },
              React.createElement(ProjectForm, {
                onAdd: (project) => {
                  onAdd(project);
                  setShowModal(false);
                },
              })
            )
          : null,
        React.createElement(CalendarComponent, { projects: projects }),
        React.createElement(ChartsComponent, { projects: projects }),
        React.createElement(ProjectTable, {
          projects: projects,
          onDelete: onDelete,
          onToggleFinish: onToggleFinish,
        })
      )
    );
  }

  /**
   * Clients page showing unique clients and their contact information. It
   * computes a list of clients from the projects prop.
   */
  function ClientsPage({ projects }) {
    // Build a map of client to contact
    const clientMap = {};
    projects.forEach((p) => {
      const key = (p.client || '').trim();
      if (key) {
        if (!clientMap[key]) {
          clientMap[key] = { contact: p.contact || '', count: 1 };
        } else {
          clientMap[key].count += 1;
          // If contact is missing, update from this project
          if (!clientMap[key].contact && p.contact) {
            clientMap[key].contact = p.contact;
          }
        }
      }
    });
    const clients = Object.keys(clientMap).map((name) => ({
      name,
      contact: clientMap[name].contact,
      count: clientMap[name].count,
    }));
    return React.createElement(
      'div',
      { className: 'container' },
      React.createElement(
        'div',
        { className: 'card' },
        React.createElement('h2', null, 'Clients'),
        React.createElement(
          'table',
          null,
          React.createElement(
            'thead',
            null,
            React.createElement(
              'tr',
              null,
              React.createElement('th', null, 'Client Name'),
              React.createElement('th', null, 'Contact'),
              React.createElement('th', null, '# Projects')
            )
          ),
          React.createElement(
            'tbody',
            null,
            clients.map((c) =>
              React.createElement(
                'tr',
                { key: c.name },
                React.createElement('td', null, c.name),
                React.createElement('td', null, c.contact),
                React.createElement('td', null, c.count)
              )
            )
          )
        )
      )
    );
  }

  /**
   * A simple modal component that displays children content. Clicking the
   * close button or outside the content calls onClose.
   */
  function Modal({ children, onClose }) {
    return React.createElement(
      'div',
      {
        className: 'modal-overlay',
        onClick: (e) => {
          // close modal when clicking on the overlay, not the content
          if (e.target.classList.contains('modal-overlay')) {
            onClose();
          }
        },
      },
      React.createElement(
        'div',
        { className: 'modal-content' },
        React.createElement(
          'button',
          { className: 'modal-close', onClick: onClose },
          '×'
        ),
        children
      )
    );
  }

  /**
   * Form component for creating or editing projects. Includes fields for
   * title, deadline, person, client, contact, achievement, price and finished.
   */
  function ProjectForm({ onAdd }) {
    const [formState, setFormState] = useState({
      title: '',
      deadline: '',
      person: '',
      client: '',
      contact: '',
      achievements: 0,
      price: 0,
      finished: 0,
      description: '',
    });

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormState((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formState.title || !formState.deadline || !formState.person) {
        alert('Title, deadline and person are required.');
        return;
      }
      const payload = {
        ...formState,
        achievements: parseFloat(formState.achievements) || 0,
        price: parseFloat(formState.price) || 0,
      };
      onAdd(payload);
      // reset form
      setFormState({
        title: '',
        deadline: '',
        person: '',
        client: '',
        contact: '',
        achievements: 0,
        price: 0,
        finished: 0,
        description: '',
      });
    };

    return React.createElement(
      'form',
      { onSubmit: handleSubmit },
      React.createElement('h2', null, 'New Project'),
      React.createElement(
        'div',
        { className: 'form-row' },
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement('label', { htmlFor: 'title' }, 'Title'),
          React.createElement('input', {
            type: 'text',
            id: 'title',
            name: 'title',
            value: formState.title,
            onChange: handleChange,
          })
        ),
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement('label', { htmlFor: 'deadline' }, 'Deadline'),
          React.createElement('input', {
            type: 'date',
            id: 'deadline',
            name: 'deadline',
            value: formState.deadline,
            onChange: handleChange,
          })
        ),
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement('label', { htmlFor: 'person' }, 'Person In Charge'),
          React.createElement('input', {
            type: 'text',
            id: 'person',
            name: 'person',
            value: formState.person,
            onChange: handleChange,
          })
        ),
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement('label', { htmlFor: 'client' }, 'Client Name'),
          React.createElement('input', {
            type: 'text',
            id: 'client',
            name: 'client',
            value: formState.client,
            onChange: handleChange,
          })
        ),
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement('label', { htmlFor: 'contact' }, 'Client Contact'),
          React.createElement('input', {
            type: 'text',
            id: 'contact',
            name: 'contact',
            value: formState.contact,
            onChange: handleChange,
          })
        ),
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement('label', { htmlFor: 'achievements' }, 'Achievement (%)'),
          React.createElement('input', {
            type: 'number',
            id: 'achievements',
            name: 'achievements',
            value: formState.achievements,
            onChange: handleChange,
            min: '0',
            max: '100',
            step: '0.01',
          })
        ),
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement('label', { htmlFor: 'price' }, 'Price'),
          React.createElement('input', {
            type: 'number',
            id: 'price',
            name: 'price',
            value: formState.price,
            onChange: handleChange,
            min: '0',
            step: '0.01',
          })
        ),
        React.createElement(
          'div',
          { className: 'form-group' },
          React.createElement('label', { htmlFor: 'finished' }, 'Completed?'),
          React.createElement('input', {
            type: 'checkbox',
            id: 'finished',
            name: 'finished',
            checked: formState.finished === 1,
            onChange: handleChange,
          })
        )
      ),
      React.createElement(
        'div',
        { className: 'form-group' },
        React.createElement('label', { htmlFor: 'description' }, 'Description'),
        React.createElement('textarea', {
          id: 'description',
          name: 'description',
          rows: 3,
          value: formState.description,
          onChange: handleChange,
        })
      ),
      React.createElement(
        'button',
        { type: 'submit' },
        'Save Project'
      )
    );
  }

  /**
   * Table listing all projects. Includes columns for price and finished status
   * and exposes controls to toggle completion and delete a project.
   */
  function ProjectTable({ projects, onDelete, onToggleFinish }) {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('h2', null, 'Projects Overview'),
      React.createElement(
        'table',
        null,
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            [
              'Title',
              'Deadline',
              'Person',
              'Client',
              'Contact',
              'Achievement (%)',
              'Price',
              'Completed',
              'Actions',
            ].map((head) => React.createElement('th', { key: head }, head))
          )
        ),
        React.createElement(
          'tbody',
          null,
          projects.map((p) =>
            React.createElement(
              'tr',
              { key: p.id },
              React.createElement('td', null, p.title),
              React.createElement('td', null, p.deadline),
              React.createElement('td', null, p.person),
              React.createElement('td', null, p.client),
              React.createElement('td', null, p.contact),
              React.createElement('td', null, p.achievements),
              React.createElement('td', null, p.price),
              React.createElement(
                'td',
                null,
                p.finished ? 'Yes' : 'No'
              ),
              React.createElement(
                'td',
                null,
                React.createElement(
                  'button',
                  {
                    onClick: () => onToggleFinish(p),
                    style: {
                      backgroundColor: p.finished ? '#fbbf24' : '#10b981',
                      color: '#fff',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      border: 'none',
                      marginRight: '0.5rem',
                      cursor: 'pointer',
                    },
                  },
                  p.finished ? 'Undo' : 'Complete'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => onDelete(p.id),
                    style: {
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                    },
                  },
                  'Delete'
                )
              )
            )
          )
        )
      )
    );
  }

  /**
   * FullCalendar wrapper component. Colours events based on completion and
   * displays a pop‑up with project details when clicked.
   */
  function CalendarComponent({ projects }) {
    const calendarEl = useRef(null);
    const calendarObj = useRef(null);

    useEffect(() => {
      const events = projects.map((p) => ({
        id: String(p.id),
        title: p.title,
        start: p.deadline,
        allDay: true,
        color: p.finished ? '#10b981' : '#3b82f6',
        extendedProps: p,
      }));
      if (!calendarObj.current) {
        calendarObj.current = new FullCalendar.Calendar(calendarEl.current, {
          initialView: 'dayGridMonth',
          headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listWeek',
          },
          events,
          eventClick: function (info) {
            const p = info.event.extendedProps;
            const details =
              `Title: ${p.title}\n` +
              `Deadline: ${p.deadline}\n` +
              `Person: ${p.person}\n` +
              `Client: ${p.client}\n` +
              `Contact: ${p.contact}\n` +
              `Achievement: ${p.achievements}%\n` +
              `Price: ${p.price}\n` +
              `Completed: ${p.finished ? 'Yes' : 'No'}\n` +
              `Description: ${p.description}`;
            alert(details);
          },
        });
        calendarObj.current.render();
      } else {
        calendarObj.current.removeAllEvents();
        calendarObj.current.addEventSource(events);
      }
    }, [projects]);

    return React.createElement(
      React.Fragment,
      null,
      React.createElement('h2', null, 'Project Deadlines'),
      React.createElement(
        'div',
        { className: 'calendar-container' },
        React.createElement('div', { id: 'calendar', ref: calendarEl })
      )
    );
  }

  /**
   * Charts component that renders two charts: one summarising completed vs
   * pending projects and another showing each project’s price. Charts are
   * updated whenever the projects array changes.
   */
  function ChartsComponent({ projects }) {
    const summaryRef = useRef(null);
    const revenueRef = useRef(null);
    const summaryChart = useRef(null);
    const revenueChart = useRef(null);

    useEffect(() => {
      // Compute summary counts
      const total = projects.length;
      const finishedCount = projects.filter((p) => p.finished).length;
      const pendingCount = total - finishedCount;
      const summaryLabels = ['Completed', 'Pending'];
      const summaryData = [finishedCount, pendingCount];
      // Compute revenue per project
      const revenueLabels = projects.map((p) => p.title);
      const revenueData = projects.map((p) => Number(p.price));

      // Summary chart (pie or bar). We'll use bar for consistency
      if (!summaryChart.current) {
        summaryChart.current = new Chart(summaryRef.current.getContext('2d'), {
          type: 'bar',
          data: {
            labels: summaryLabels,
            datasets: [
              {
                label: 'Projects',
                data: summaryData,
                backgroundColor: ['rgba(52, 211, 153, 0.6)', 'rgba(252, 211, 77, 0.6)'],
                borderColor: ['rgba(52, 211, 153, 1)', 'rgba(252, 211, 77, 1)'],
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: 'Project Completion Summary' },
              legend: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: 'Number of Projects' },
              },
            },
          },
        });
      } else {
        summaryChart.current.data.labels = summaryLabels;
        summaryChart.current.data.datasets[0].data = summaryData;
        summaryChart.current.update();
      }

      // Revenue chart
      if (!revenueChart.current) {
        revenueChart.current = new Chart(revenueRef.current.getContext('2d'), {
          type: 'bar',
          data: {
            labels: revenueLabels,
            datasets: [
              {
                label: 'Price',
                data: revenueData,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: 'Project Revenue' },
              legend: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: 'Price' },
              },
              x: { title: { display: true, text: 'Project' } },
            },
          },
        });
      } else {
        revenueChart.current.data.labels = revenueLabels;
        revenueChart.current.data.datasets[0].data = revenueData;
        revenueChart.current.update();
      }
    }, [projects]);

    return React.createElement(
      React.Fragment,
      null,
      React.createElement('h2', null, 'Charts'),
      React.createElement(
        'div',
        { className: 'charts-container' },
        React.createElement(
          'div',
          { className: 'chart-box' },
          React.createElement('canvas', { ref: summaryRef })
        ),
        React.createElement(
          'div',
          { className: 'chart-box' },
          React.createElement('canvas', { ref: revenueRef })
        )
      )
    );
  }

  // Kick off rendering. Use ReactDOM.render for compatibility with the UMD build.
  ReactDOM.render(
    React.createElement(App),
    document.getElementById('root')
  );
})();
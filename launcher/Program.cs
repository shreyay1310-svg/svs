using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace StudentVerificationLauncher
{
    public class MainForm : Form
    {
        private Process serverProcess;
        private NotifyIcon trayIcon;
        private ContextMenu trayMenu;

        private Label lblStatusDot;
        private Label lblStatusText;
        private Label lblUrl;
        private ProgressBar progressBar;
        private Button btnOpenApp;
        private Button btnRestart;
        private Button btnExit;
        private Button btnCopyUser;
        private Button btnCopyPass;

        private const string AppUrl = "http://localhost:3000/login";
        private const string AdminUser = "ADMIN001";
        private const string AdminPass = "Rahul@8052";

        private string nodePath;
        private string scriptPath;
        private string workingDir;
        private bool isServerRunning = false;

        public MainForm()
        {
            InitializeComponent();
            InitializeTray();

            this.Load += (s, e) => {
                new Thread(StartWorkflow).Start();
            };

            this.FormClosing += MainForm_FormClosing;
        }

        private void InitializeComponent()
        {
            this.Text = "Student Data Verification System";
            this.Size = new Size(540, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            // ─── Header Panel ───
            Panel headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 75;
            headerPanel.BackColor = Color.FromArgb(15, 23, 42); // Slate 900
            this.Controls.Add(headerPanel);

            Label lblTitle = new Label();
            lblTitle.Text = "Student Data Verification System";
            lblTitle.Font = new Font("Segoe UI", 13F, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(20, 14);
            lblTitle.AutoSize = true;
            headerPanel.Controls.Add(lblTitle);

            Label lblSubtitle = new Label();
            lblSubtitle.Text = "Portal Server Control & Admin Management";
            lblSubtitle.Font = new Font("Segoe UI", 8.5F);
            lblSubtitle.ForeColor = Color.FromArgb(148, 163, 184); // Slate 400
            lblSubtitle.Location = new Point(20, 42);
            lblSubtitle.AutoSize = true;
            headerPanel.Controls.Add(lblSubtitle);

            // ─── Status Card ───
            Panel statusCard = new Panel();
            statusCard.Location = new Point(20, 95);
            statusCard.Size = new Size(485, 75);
            statusCard.BackColor = Color.White;
            statusCard.Paint += (s, pe) => {
                ControlPaint.DrawBorder(pe.Graphics, statusCard.ClientRectangle, Color.FromArgb(226, 232, 240), ButtonBorderStyle.Solid);
            };
            this.Controls.Add(statusCard);

            lblStatusDot = new Label();
            lblStatusDot.Text = "●";
            lblStatusDot.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
            lblStatusDot.ForeColor = Color.FromArgb(234, 179, 8); // Yellow (Starting)
            lblStatusDot.Location = new Point(16, 14);
            lblStatusDot.Size = new Size(20, 24);
            statusCard.Controls.Add(lblStatusDot);

            lblStatusText = new Label();
            lblStatusText.Text = "Starting backend server...";
            lblStatusText.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            lblStatusText.ForeColor = Color.FromArgb(30, 41, 59);
            lblStatusText.Location = new Point(40, 16);
            lblStatusText.Size = new Size(420, 22);
            statusCard.Controls.Add(lblStatusText);

            progressBar = new ProgressBar();
            progressBar.Style = ProgressBarStyle.Marquee;
            progressBar.MarqueeAnimationSpeed = 30;
            progressBar.Location = new Point(18, 44);
            progressBar.Size = new Size(450, 14);
            statusCard.Controls.Add(progressBar);

            lblUrl = new Label();
            lblUrl.Text = AppUrl;
            lblUrl.Font = new Font("Segoe UI", 8.5F, FontStyle.Underline);
            lblUrl.ForeColor = Color.FromArgb(79, 70, 229);
            lblUrl.Cursor = Cursors.Hand;
            lblUrl.Location = new Point(40, 44);
            lblUrl.Size = new Size(300, 20);
            lblUrl.Visible = false;
            lblUrl.Click += (s, e) => OpenAppWindow();
            statusCard.Controls.Add(lblUrl);

            // ─── Credentials Card ───
            Panel credCard = new Panel();
            credCard.Location = new Point(20, 185);
            credCard.Size = new Size(485, 115);
            credCard.BackColor = Color.White;
            credCard.Paint += (s, pe) => {
                ControlPaint.DrawBorder(pe.Graphics, credCard.ClientRectangle, Color.FromArgb(226, 232, 240), ButtonBorderStyle.Solid);
            };
            this.Controls.Add(credCard);

            Label lblCredHeader = new Label();
            lblCredHeader.Text = "ADMIN LOGIN CREDENTIALS";
            lblCredHeader.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
            lblCredHeader.ForeColor = Color.FromArgb(100, 116, 139);
            lblCredHeader.Location = new Point(16, 12);
            lblCredHeader.AutoSize = true;
            credCard.Controls.Add(lblCredHeader);

            // Role Row
            Label lblRoleTitle = new Label();
            lblRoleTitle.Text = "Role:";
            lblRoleTitle.ForeColor = Color.FromArgb(100, 116, 139);
            lblRoleTitle.Location = new Point(16, 36);
            lblRoleTitle.Size = new Size(80, 20);
            credCard.Controls.Add(lblRoleTitle);

            Label lblRoleVal = new Label();
            lblRoleVal.Text = "Administrator";
            lblRoleVal.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            lblRoleVal.ForeColor = Color.FromArgb(15, 23, 42);
            lblRoleVal.Location = new Point(100, 36);
            lblRoleVal.Size = new Size(150, 20);
            credCard.Controls.Add(lblRoleVal);

            // User ID Row
            Label lblUserTitle = new Label();
            lblUserTitle.Text = "User ID:";
            lblUserTitle.ForeColor = Color.FromArgb(100, 116, 139);
            lblUserTitle.Location = new Point(16, 60);
            lblUserTitle.Size = new Size(80, 20);
            credCard.Controls.Add(lblUserTitle);

            Label lblUserVal = new Label();
            lblUserVal.Text = AdminUser + "  (or: admin)";
            lblUserVal.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            lblUserVal.ForeColor = Color.FromArgb(15, 23, 42);
            lblUserVal.Location = new Point(100, 60);
            lblUserVal.Size = new Size(240, 20);
            credCard.Controls.Add(lblUserVal);

            btnCopyUser = new Button();
            btnCopyUser.Text = "Copy ID";
            btnCopyUser.Size = new Size(70, 22);
            btnCopyUser.Location = new Point(395, 58);
            btnCopyUser.Font = new Font("Segoe UI", 7.5F);
            btnCopyUser.BackColor = Color.FromArgb(241, 245, 249);
            btnCopyUser.FlatStyle = FlatStyle.Flat;
            btnCopyUser.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnCopyUser.Click += (s, e) => {
                Clipboard.SetText(AdminUser);
                ShowMessage("Admin User ID copied to clipboard!");
            };
            credCard.Controls.Add(btnCopyUser);

            // Password Row
            Label lblPassTitle = new Label();
            lblPassTitle.Text = "Password:";
            lblPassTitle.ForeColor = Color.FromArgb(100, 116, 139);
            lblPassTitle.Location = new Point(16, 84);
            lblPassTitle.Size = new Size(80, 20);
            credCard.Controls.Add(lblPassTitle);

            Label lblPassVal = new Label();
            lblPassVal.Text = AdminPass + "  (or: admin)";
            lblPassVal.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            lblPassVal.ForeColor = Color.FromArgb(15, 23, 42);
            lblPassVal.Location = new Point(100, 84);
            lblPassVal.Size = new Size(240, 20);
            credCard.Controls.Add(lblPassVal);

            btnCopyPass = new Button();
            btnCopyPass.Text = "Copy Pass";
            btnCopyPass.Size = new Size(70, 22);
            btnCopyPass.Location = new Point(395, 82);
            btnCopyPass.Font = new Font("Segoe UI", 7.5F);
            btnCopyPass.BackColor = Color.FromArgb(241, 245, 249);
            btnCopyPass.FlatStyle = FlatStyle.Flat;
            btnCopyPass.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnCopyPass.Click += (s, e) => {
                Clipboard.SetText(AdminPass);
                ShowMessage("Admin Password copied to clipboard!");
            };
            credCard.Controls.Add(btnCopyPass);

            // ─── Bottom Actions ───
            btnOpenApp = new Button();
            btnOpenApp.Text = "🌐 Open Application";
            btnOpenApp.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnOpenApp.ForeColor = Color.White;
            btnOpenApp.BackColor = Color.FromArgb(79, 70, 229); // Indigo 600
            btnOpenApp.FlatStyle = FlatStyle.Flat;
            btnOpenApp.FlatAppearance.BorderSize = 0;
            btnOpenApp.Location = new Point(20, 315);
            btnOpenApp.Size = new Size(180, 42);
            btnOpenApp.Cursor = Cursors.Hand;
            btnOpenApp.Click += (s, e) => OpenAppWindow();
            this.Controls.Add(btnOpenApp);

            btnRestart = new Button();
            btnRestart.Text = "🔄 Restart Server";
            btnRestart.Font = new Font("Segoe UI", 9F);
            btnRestart.ForeColor = Color.FromArgb(51, 65, 85);
            btnRestart.BackColor = Color.White;
            btnRestart.FlatStyle = FlatStyle.Flat;
            btnRestart.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnRestart.Location = new Point(210, 315);
            btnRestart.Size = new Size(130, 42);
            btnRestart.Click += (s, e) => RestartWorkflow();
            this.Controls.Add(btnRestart);

            btnExit = new Button();
            btnExit.Text = "❌ Stop & Exit";
            btnExit.Font = new Font("Segoe UI", 9F);
            btnExit.ForeColor = Color.FromArgb(220, 38, 38); // Red 600
            btnExit.BackColor = Color.White;
            btnExit.FlatStyle = FlatStyle.Flat;
            btnExit.FlatAppearance.BorderColor = Color.FromArgb(254, 202, 202);
            btnExit.Location = new Point(350, 315);
            btnExit.Size = new Size(155, 42);
            btnExit.Click += (s, e) => ExitApplication();
            this.Controls.Add(btnExit);
        }

        private void InitializeTray()
        {
            trayMenu = new ContextMenu();
            trayMenu.MenuItems.Add("🌐 Open Web App", (s, e) => {
                this.Show();
                this.WindowState = FormWindowState.Normal;
                OpenAppWindow();
            });
            trayMenu.MenuItems.Add("📋 Copy Admin ID", (s, e) => {
                Clipboard.SetText(AdminUser);
                trayIcon.ShowBalloonTip(2000, "Copied", "Admin ID copied!", ToolTipIcon.Info);
            });
            trayMenu.MenuItems.Add("📋 Copy Admin Password", (s, e) => {
                Clipboard.SetText(AdminPass);
                trayIcon.ShowBalloonTip(2000, "Copied", "Admin password copied!", ToolTipIcon.Info);
            });
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add("🔄 Restart Server", (s, e) => RestartWorkflow());
            trayMenu.MenuItems.Add("❌ Stop & Exit", (s, e) => ExitApplication());

            trayIcon = new NotifyIcon();
            trayIcon.Text = "Student Data Verification System";
            trayIcon.Icon = SystemIcons.Application;
            trayIcon.ContextMenu = trayMenu;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => {
                this.Show();
                this.WindowState = FormWindowState.Normal;
                this.BringToFront();
            };
        }

        private void StartWorkflow()
        {
            try
            {
                SetStatus("Checking Node.js environment...", Color.FromArgb(234, 179, 8), true);
                nodePath = FindNode();
                if (string.IsNullOrEmpty(nodePath))
                {
                    SetStatus("Node.js not found! Please install Node.js.", Color.FromArgb(220, 38, 38), false);
                    MessageBox.Show(
                        "Node.js was not found on this system.\nPlease install Node.js from https://nodejs.org/ to run the server.",
                        "Node.js Required",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                SetStatus("Locating application bundle...", Color.FromArgb(234, 179, 8), true);
                if (!FindBundle())
                {
                    SetStatus("dist/boot.cjs not found!", Color.FromArgb(220, 38, 38), false);
                    MessageBox.Show(
                        "Could not locate dist/boot.cjs.\nPlease run 'npm run build' inside the app folder first.",
                        "Bundle Missing",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                SetStatus("Starting server process...", Color.FromArgb(234, 179, 8), true);
                StartServer();

                SetStatus("Waiting for server on http://localhost:3000...", Color.FromArgb(234, 179, 8), true);
                bool ready = WaitForPort(20);

                if (ready)
                {
                    isServerRunning = true;
                    SetStatus("Server Running on http://localhost:3000", Color.FromArgb(22, 163, 74), false);
                    this.Invoke((Action)(() => {
                        lblUrl.Visible = true;
                        OpenAppWindow();
                    }));
                }
                else
                {
                    SetStatus("Server started. Opening portal...", Color.FromArgb(22, 163, 74), false);
                    this.Invoke((Action)(() => {
                        lblUrl.Visible = true;
                        OpenAppWindow();
                    }));
                }
            }
            catch (Exception ex)
            {
                SetStatus("Startup failed: " + ex.Message, Color.FromArgb(220, 38, 38), false);
            }
        }

        private void RestartWorkflow()
        {
            new Thread(() => {
                StopServer();
                Thread.Sleep(1000);
                StartWorkflow();
            }).Start();
        }

        private void SetStatus(string text, Color dotColor, bool showProgress)
        {
            if (this.InvokeRequired)
            {
                this.Invoke((Action)(() => SetStatus(text, dotColor, showProgress)));
                return;
            }

            lblStatusText.Text = text;
            lblStatusDot.ForeColor = dotColor;
            progressBar.Visible = showProgress;
        }

        private string FindNode()
        {
            string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string p in pathEnv.Split(Path.PathSeparator))
            {
                try
                {
                    string full = Path.Combine(p.Trim(), "node.exe");
                    if (File.Exists(full)) return full;
                }
                catch { }
            }

            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "nodejs", "node.exe")
            };

            foreach (string c in candidates)
            {
                if (File.Exists(c)) return c;
            }
            return null;
        }

        private bool FindBundle()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] searchDirs = new string[]
            {
                baseDir,
                Path.Combine(baseDir, "app"),
                Path.Combine(baseDir, "..", "app"),
                Directory.GetCurrentDirectory(),
                Path.Combine(Directory.GetCurrentDirectory(), "app")
            };

            foreach (string dir in searchDirs)
            {
                try
                {
                    string candidate = Path.Combine(dir, "dist", "boot.cjs");
                    if (File.Exists(candidate))
                    {
                        scriptPath = Path.GetFullPath(candidate);
                        workingDir = Path.GetFullPath(dir);
                        return true;
                    }
                }
                catch { }
            }
            return false;
        }

        private void StartServer()
        {
            StopServer();

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodePath;
            psi.Arguments = "\"" + scriptPath + "\"";
            psi.WorkingDirectory = workingDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.EnvironmentVariables["NODE_ENV"] = "production";
            psi.EnvironmentVariables["PORT"] = "3000";

            serverProcess = Process.Start(psi);
        }

        private void StopServer()
        {
            if (serverProcess != null)
            {
                try
                {
                    if (!serverProcess.HasExited)
                    {
                        serverProcess.Kill();
                        serverProcess.WaitForExit(1500);
                    }
                }
                catch { }
                serverProcess = null;
            }
            isServerRunning = false;
        }

        private bool WaitForPort(int maxSeconds)
        {
            for (int i = 0; i < maxSeconds * 2; i++)
            {
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://localhost:3000/");
                    req.Timeout = 1000;
                    req.Method = "GET";
                    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                    {
                        if (resp.StatusCode == HttpStatusCode.OK) return true;
                    }
                }
                catch { }
                Thread.Sleep(500);
            }
            return false;
        }

        private void OpenAppWindow()
        {
            try
            {
                string[] edgePaths = new string[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe")
                };

                foreach (string ep in edgePaths)
                {
                    if (File.Exists(ep))
                    {
                        Process.Start(new ProcessStartInfo() {
                            FileName = ep,
                            Arguments = "--app=\"" + AppUrl + "\" --window-size=1280,850"
                        });
                        return;
                    }
                }

                Process.Start(new ProcessStartInfo(AppUrl) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not open browser: " + ex.Message);
            }
        }

        private void ShowMessage(string msg)
        {
            trayIcon.ShowBalloonTip(2000, "Notification", msg, ToolTipIcon.Info);
        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                this.Hide();
                trayIcon.ShowBalloonTip(
                    2500,
                    "SVS Server Active",
                    "Application is running in background. Right-click this tray icon to open or exit.",
                    ToolTipIcon.Info
                );
            }
            else
            {
                StopServer();
            }
        }

        private void ExitApplication()
        {
            StopServer();
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }
            Application.Exit();
            Environment.Exit(0);
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool createdNew;
            using (Mutex mutex = new Mutex(true, "StudentDataVerification_App_Instance", out createdNew))
            {
                if (!createdNew)
                {
                    try
                    {
                        Process.Start(new ProcessStartInfo(AppUrl) { UseShellExecute = true });
                    }
                    catch { }
                    return;
                }

                Application.Run(new MainForm());
            }
        }
    }
}

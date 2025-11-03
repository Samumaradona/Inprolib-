import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch


def box(ax, x, y, w, h, title, color='#ffffff'):
    rect = Rectangle((x, y), w, h, linewidth=1.5, edgecolor='#333333', facecolor=color)
    ax.add_patch(rect)
    ax.text(x + w/2, y + h - 0.35, title, ha='center', va='top', fontsize=12, color='#111111', fontweight='bold')
    return rect


def arrow(ax, x1, y1, x2, y2, label=None):
    arr = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle='->', mutation_scale=12, linewidth=1.2, color='#333333')
    ax.add_patch(arr)
    if label:
        ax.text((x1 + x2) / 2, (y1 + y2) / 2 + 0.1, label, ha='center', va='bottom', fontsize=10, color='#333333')
    return arr


def main():
    fig, ax = plt.subplots(figsize=(12, 8), dpi=160)
    ax.set_axis_off()

    # Top: Flask App
    box(ax, 4.5, 6.7, 3.0, 1.0, 'Flask App', color='#E6F4FF')

    # Routes row
    routes_y = 5.2
    box(ax, 0.3, routes_y, 2.3, 0.9, 'login.py', color='#F8F8F8')
    box(ax, 3.0, routes_y, 2.3, 0.9, 'home.py', color='#F8F8F8')
    box(ax, 5.7, routes_y, 2.3, 0.9, 'admin.py', color='#F8F8F8')
    box(ax, 8.4, routes_y, 2.3, 0.9, 'api.py', color='#F8F8F8')

    # Services row
    svc_y = 3.7
    box(ax, 0.3, svc_y, 2.5, 0.9, 'Auth Service', color='#FFF7E6')
    box(ax, 3.2, svc_y, 2.5, 0.9, 'File Service', color='#FFF7E6')
    box(ax, 6.1, svc_y, 2.5, 0.9, 'Preview Service', color='#FFF7E6')
    box(ax, 9.0, svc_y, 2.5, 0.9, 'Report Service', color='#FFF7E6')

    # Storage row
    sto_y = 1.5
    box(ax, 1.0, sto_y, 3.6, 1.2, 'PostgreSQL', color='#E8F5E9')
    box(ax, 5.0, sto_y, 2.6, 1.2, 'uploads/', color='#E8F5E9')
    box(ax, 8.2, sto_y, 2.6, 1.2, 'previews/', color='#E8F5E9')

    # Connections from Flask to routes
    arrow(ax, 6.0, 6.7, 1.5, routes_y + 0.9)
    arrow(ax, 6.0, 6.7, 4.15, routes_y + 0.9)
    arrow(ax, 6.0, 6.7, 7.0, routes_y + 0.9)
    arrow(ax, 6.0, 6.7, 9.9, routes_y + 0.9)

    # Routes to services
    arrow(ax, 1.5, routes_y, 1.55, svc_y + 0.9, 'login, esqueceu senha')
    arrow(ax, 4.15, routes_y, 4.45, svc_y + 0.9, 'home, navegação')
    arrow(ax, 7.0, routes_y, 7.35, svc_y + 0.9, 'admin, gestão')
    arrow(ax, 9.9, routes_y, 10.25, svc_y + 0.9, 'API REST')

    # Services to storage
    arrow(ax, 1.55, svc_y, 2.8, sto_y + 1.2, 'usuarios, cursos')
    arrow(ax, 4.45, svc_y, 6.3, sto_y + 1.2, 'uploads')
    arrow(ax, 7.35, svc_y, 9.0, sto_y + 1.2, 'previews')
    arrow(ax, 10.25, svc_y, 3.8, sto_y + 1.2, 'relatórios')

    # Legend
    ax.text(0.2, 0.4, 'Legenda:', fontsize=11, fontweight='bold', color='#333333')
    legend_items = [
        ('Rotas', '#F8F8F8'),
        ('Serviços internos', '#FFF7E6'),
        ('Armazenamento', '#E8F5E9'),
    ]
    for i, (lbl, c) in enumerate(legend_items):
        rect = Rectangle((0.2 + i * 2.6, 0.15), 0.35, 0.2, facecolor=c, edgecolor='#333333')
        ax.add_patch(rect)
        ax.text(0.6 + i * 2.6, 0.25, lbl, va='center', fontsize=10)

    ax.set_xlim(0, 11)
    ax.set_ylim(0, 8)
    plt.tight_layout()
    out_path = 'static/img/backend-architecture.png'
    plt.savefig(out_path, dpi=160)
    print(f'PNG gerado em {out_path}')


if __name__ == '__main__':
    main()